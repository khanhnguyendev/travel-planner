import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripInvite, TripRole } from '@/lib/types';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// -------------------------------------------------------
// Rate limiting (simple in-memory per IP, resets on cold start)
// -------------------------------------------------------

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// -------------------------------------------------------
// POST /api/invites/accept
// -------------------------------------------------------

const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  if (!checkRateLimit(ip)) {
    return errorResponse('rate_limited', 'Too many requests. Please try again later.', 429);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse('forbidden', 'Not authenticated', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('invalid', 'Invalid JSON body', 400);
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { token } = parsed.data;
  const admin = createAdminClient();

  // Look up invite by token (use admin client since token column is sensitive)
  const { data: inviteData, error: inviteError } = await admin
    .from('trip_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (inviteError) {
    console.error('acceptInvite lookup error:', inviteError);
    return errorResponse('server_error', 'Failed to look up invite', 500);
  }

  const invite = inviteData as TripInvite | null;

  if (!invite) {
    return errorResponse('not_found', 'Invite not found', 404);
  }

  if (invite.status === 'revoked') {
    return errorResponse('forbidden', 'This invite has been revoked', 403);
  }

  if (invite.status === 'accepted') {
    return errorResponse('conflict', 'This invite has already been accepted', 409);
  }

  if (new Date(invite.expires_at) < new Date()) {
    // Mark as expired
    await admin
      .from('trip_invites')
      .update({ status: 'expired' })
      .eq('id', invite.id);
    return errorResponse('forbidden', 'This invite has expired', 403);
  }

  // Check if user is already a member
  const { data: existingMember } = await admin
    .from('trip_members')
    .select('id')
    .eq('trip_id', invite.trip_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingMember) {
    // Mark invite as accepted and return success
    await admin
      .from('trip_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return NextResponse.json({
      ok: true,
      data: { tripId: invite.trip_id, role: invite.role as TripRole },
    });
  }

  // Create trip_members row
  const { error: memberError } = await admin.from('trip_members').insert({
    trip_id: invite.trip_id,
    user_id: user.id,
    role: invite.role,
    invite_status: 'accepted',
    joined_at: new Date().toISOString(),
  });

  if (memberError) {
    console.error('acceptInvite member insert error:', memberError);
    return errorResponse('server_error', 'Failed to add member', 500);
  }

  // Mark invite as accepted
  const { error: updateError } = await admin
    .from('trip_invites')
    .update({ status: 'accepted' })
    .eq('id', invite.id);

  if (updateError) {
    console.error('acceptInvite update error:', updateError);
    // Non-fatal — member was created, just log
  }

  return NextResponse.json({
    ok: true,
    data: { tripId: invite.trip_id, role: invite.role as TripRole },
  });
}
