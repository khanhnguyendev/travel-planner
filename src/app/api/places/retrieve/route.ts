import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { retrievePlace } from '@/features/places/mapbox';
import type { ProjectMember, Category } from '@/lib/types';

// -------------------------------------------------------
// Request schema
// -------------------------------------------------------

const retrieveSchema = z.object({
  mapboxId: z.string().min(1, 'mapboxId is required'),
  sessionToken: z.string().min(1, 'sessionToken is required'),
  projectId: z.string().uuid('projectId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
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
// POST /api/places/retrieve
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

  const parsed = retrieveSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { mapboxId, sessionToken, projectId, categoryId } = parsed.data;

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

  // 5. Retrieve full place details from Mapbox
  let detail;
  try {
    detail = await retrievePlace(mapboxId, sessionToken);
  } catch (err) {
    console.error('[api/places/retrieve] retrievePlace error:', err);
    return errorResponse('server_error', 'Failed to retrieve place details', 500);
  }

  const admin = createAdminClient();

  // 6. Upsert into places table (unique on project_id + external_place_id)
  const placePayload = {
    project_id: projectId,
    category_id: categoryId,
    created_by_user_id: user.id,
    source_url: null,
    source_provider: 'mapbox',
    external_place_id: detail.mapbox_id,
    name: detail.name,
    address: detail.address,
    lat: detail.lat,
    lng: detail.lng,
    rating: null,
    price_level: null,
    editorial_summary: null,
    metadata_json: null,
    visit_date: null,
    visit_time_from: null,
    visit_time_to: null,
    backup_place_id: null,
  };

  const { data: inserted, error: insertError } = await admin
    .from('places')
    .insert(placePayload)
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { ok: false, error: { code: 'conflict', message: 'Place already added' } },
        { status: 409 }
      );
    }
    console.error('[api/places/retrieve] insert error:', insertError);
    return errorResponse('server_error', 'Failed to save place', 500);
  }

  if (!inserted) {
    return errorResponse('server_error', 'Failed to save place', 500);
  }

  // 7. No place_reviews inserted (Mapbox provides no reviews)

  return NextResponse.json(
    { ok: true, data: { place: inserted } },
    { status: 201 }
  );
}
