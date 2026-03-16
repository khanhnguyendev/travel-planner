import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveGoogleMapsUrl } from '@/features/places/resolve';
import type { ProjectMember, Category } from '@/lib/types';

// -------------------------------------------------------
// Request schema
// -------------------------------------------------------

const resolveSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  googleMapsUrl: z.string().url('googleMapsUrl must be a valid URL'),
  forceRefresh: z.boolean().optional().default(false),
});

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}

// -------------------------------------------------------
// POST /api/places/resolve
// -------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid', 'Invalid JSON body', 400);
  }

  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { projectId, categoryId, googleMapsUrl, forceRefresh } = parsed.data;

  // 3. Verify caller is editor/admin/owner of project
  const { data: membershipData } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const membership = membershipData as ProjectMember | null;

  if (!membership) {
    return errorResponse('forbidden', 'Not a member of this project', 403);
  }

  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role);
  if (!canEdit) {
    return errorResponse('forbidden', 'Insufficient permissions', 403);
  }

  // 4. Validate categoryId belongs to same project
  const { data: categoryData } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .eq('project_id', projectId)
    .single();

  const category = categoryData as Category | null;

  if (!category) {
    return errorResponse(
      'invalid',
      'categoryId does not belong to this project',
      400
    );
  }

  // 5. Resolve the Google Maps URL
  let resolved;
  try {
    resolved = await resolveGoogleMapsUrl(googleMapsUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'rate_limited') {
      return errorResponse(
        'rate_limited',
        'Google Places API rate limit exceeded — please try again later',
        429
      );
    }
    if (msg.startsWith('invalid_url') || msg.startsWith('invalid_place')) {
      return errorResponse('invalid', msg, 400);
    }
    console.error('resolveGoogleMapsUrl error:', err);
    return errorResponse('server_error', 'Failed to resolve place', 500);
  }

  const admin = createAdminClient();

  // 6. Check if place already exists in this project (de-duplicate)
  const { data: existingPlaceData } = await admin
    .from('places')
    .select('*')
    .eq('project_id', projectId)
    .eq('external_place_id', resolved.externalPlaceId)
    .single();

  const existingPlace = existingPlaceData as { id: string } | null;

  if (existingPlace && !forceRefresh) {
    const { data: existingReviews } = await admin
      .from('place_reviews')
      .select('*')
      .eq('place_id', existingPlace.id);

    const { data: fullPlace } = await admin
      .from('places')
      .select('*')
      .eq('id', existingPlace.id)
      .single();

    return NextResponse.json({
      ok: true,
      data: { place: fullPlace, reviews: existingReviews ?? [] },
    });
  }

  // 7. Upsert the place row.
  // metadata_json is typed as our local `Json` alias which is structurally
  // equivalent to Supabase's internal Json but not identical in the generic
  // chain — cast it to `unknown` so the Database Insert/Update type accepts it.
  const placePayload = {
    project_id: projectId,
    category_id: categoryId,
    created_by_user_id: user.id,
    source_url: googleMapsUrl,
    source_provider: 'google',
    external_place_id: resolved.externalPlaceId,
    name: resolved.name,
    address: resolved.address,
    lat: resolved.lat,
    lng: resolved.lng,
    rating: resolved.rating,
    price_level: resolved.priceLevel,
    editorial_summary: resolved.editorialSummary,
    metadata_json: resolved.metadataJson,
  };

  let place;
  if (existingPlace && forceRefresh) {
    const { data: updated, error: updateError } = await admin
      .from('places')
      .update(placePayload)
      .eq('id', existingPlace.id)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('place update error:', updateError);
      return errorResponse('server_error', 'Failed to update place', 500);
    }
    place = updated;
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('places')
      .insert(placePayload)
      .select('*')
      .single();

    if (insertError || !inserted) {
      console.error('place insert error:', insertError);
      if (insertError?.code === '23505') {
        return errorResponse('conflict', 'Place already exists in this project', 409);
      }
      return errorResponse('server_error', 'Failed to save place', 500);
    }
    place = inserted;
  }

  // 8. Insert reviews (delete old ones first on forceRefresh)
  if (existingPlace && forceRefresh) {
    await admin.from('place_reviews').delete().eq('place_id', (place as { id: string }).id);
  }

  let savedReviews: unknown[] = [];
  if (resolved.reviews.length > 0) {
    const reviewRows = resolved.reviews.map((r) => ({
      place_id: (place as { id: string }).id,
      project_id: projectId,
      author_name: r.authorName,
      rating: r.rating,
      text: r.text,
      published_at: r.publishedAt,
      source_provider: r.sourceProvider,
      raw_json: r.rawJson,
    }));

    const { data: reviews, error: reviewsError } = await admin
      .from('place_reviews')
      .insert(reviewRows)
      .select('*');

    if (reviewsError) {
      console.error('place_reviews insert error:', reviewsError);
    } else {
      savedReviews = reviews ?? [];
    }
  }

  return NextResponse.json(
    { ok: true, data: { place, reviews: savedReviews } },
    { status: existingPlace ? 200 : 201 }
  );
}
