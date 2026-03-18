import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { retrievePlace } from '@/features/places/mapbox';
import { createLogger } from '@/lib/logger';
import { logActivity } from '@/lib/activity';
import type { TripMember, Category } from '@/lib/types';

// -------------------------------------------------------
// Request schema
// -------------------------------------------------------

const retrieveSchema = z.object({
  mapboxId: z.string().min(1, 'mapboxId is required'),
  sessionToken: z.string().min(1, 'sessionToken is required'),
  tripId: z.string().uuid('tripId must be a valid UUID'),
  categoryId: z.string().uuid('categoryId must be a valid UUID'),
  visitDate: z.string().nullable().optional(),
  visitTimeFrom: z.string().nullable().optional(),
  visitTimeTo: z.string().nullable().optional(),
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
  const log = createLogger({ action: 'api/places/retrieve' });

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

  const { mapboxId, sessionToken, tripId, categoryId, visitDate, visitTimeFrom, visitTimeTo } = parsed.data;

  // 3. Verify caller is editor/admin/owner of trip
  const { data: membershipData } = await supabase
    .from('trip_members')
    .select('*')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const membership = membershipData as TripMember | null;

  if (!membership) {
    return errorResponse('forbidden', 'Not a member of this trip', 403);
  }

  const canEdit = ['owner', 'admin', 'editor'].includes(membership.role);
  if (!canEdit) {
    return errorResponse('forbidden', 'Insufficient permissions', 403);
  }

  // 4. Validate categoryId belongs to same trip
  const { data: categoryData } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .eq('trip_id', tripId)
    .single();

  const category = categoryData as Category | null;

  if (!category) {
    return errorResponse(
      'invalid',
      'categoryId does not belong to this trip',
      400
    );
  }

  // 5. Retrieve full place details from Mapbox
  let detail;
  try {
    detail = await retrievePlace(mapboxId, sessionToken);
  } catch (err) {
    log.error('mapbox.retrieve.failed', { error: (err as Error).message, mapboxId });
    return errorResponse('server_error', 'Failed to retrieve place details', 500);
  }

  const admin = createAdminClient();

  // 6. Upsert into places table (unique on trip_id + external_place_id)
  const placePayload = {
    trip_id: tripId,
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
    metadata_json: {
      ...(detail.region ? { region: detail.region } : {}),
      ...(detail.district ? { district: detail.district } : {}),
    },
    visit_date: visitDate ?? null,
    visit_time_from: visitTimeFrom ?? null,
    visit_time_to: visitTimeTo ?? null,
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
    log.error('place.insert.failed', { error: insertError.message, tripId, name: detail.name });
    return errorResponse('server_error', 'Failed to save place', 500);
  }

  if (!inserted) {
    return errorResponse('server_error', 'Failed to save place', 500);
  }

  log.info('place.add.ok', { placeId: (inserted as { id: string }).id, name: detail.name, tripId });
  void logActivity({
    tripId,
    userId: user.id,
    action: 'place.add',
    entityType: 'place',
    entityId: (inserted as { id: string }).id,
    meta: { placeName: detail.name, address: detail.address },
  });

  return NextResponse.json(
    { ok: true, data: { place: inserted } },
    { status: 201 }
  );
}
