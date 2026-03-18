import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchPlaces } from '@/features/places/mapbox';
import type { TripMember } from '@/lib/types';

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
// GET /api/places/search?q=...&sessionToken=...&tripId=...
// -------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  // 2. Query params
  const { searchParams } = req.nextUrl;
  const q = searchParams.get('q') ?? '';
  const sessionToken = searchParams.get('sessionToken') ?? '';
  const tripId = searchParams.get('tripId') ?? '';

  if (!tripId) {
    return errorResponse('invalid', 'tripId is required', 400);
  }

  if (!sessionToken) {
    return errorResponse('invalid', 'sessionToken is required', 400);
  }

  // Return empty if query is too short
  if (q.trim().length < 2) {
    return NextResponse.json({ ok: true, data: { suggestions: [] } });
  }

  // 3. Verify caller is trip member
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

  // 4. Fetch suggestions
  try {
    const suggestions = await searchPlaces(q.trim(), sessionToken);
    return NextResponse.json({ ok: true, data: { suggestions } });
  } catch (err) {
    console.error('[api/places/search] error:', err);
    return errorResponse('server_error', 'Failed to fetch place suggestions', 500);
  }
}
