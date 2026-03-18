import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripRole } from '@/lib/types';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const ROLE_RANK: Record<TripRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

// -------------------------------------------------------
// POST /api/invites/send
// -------------------------------------------------------

const sendInviteSchema = z.object({
  tripId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'editor', 'viewer']).default('editor'),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const parsed = sendInviteSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { tripId, email, role } = parsed.data;

  // Verify caller is owner or admin
  const { data: callerData } = await supabase
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerRole = (callerData as { role: string } | null)?.role as TripRole | undefined;
  if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
    return errorResponse('forbidden', 'Only owner or admin can send invites', 403);
  }

  // Role cannot exceed the caller's own role
  if (ROLE_RANK[role] > ROLE_RANK[callerRole]) {
    return errorResponse('forbidden', `Cannot invite someone with a role higher than your own (${callerRole})`, 403);
  }

  const admin = createAdminClient();

  // Prevent duplicate pending invite for same email+trip
  const { data: existing } = await admin
    .from('trip_invites')
    .select('id')
    .eq('trip_id', tripId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return errorResponse('conflict', 'A pending invite already exists for this email', 409);
  }

  // Generate a cryptographically secure token (at least 32 bytes of random data)
  const tokenBytes = crypto.getRandomValues(new Uint8Array(48));
  const token = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invite, error: inviteError } = await admin
    .from('trip_invites')
    .insert({
      trip_id: tripId,
      email,
      invited_by_user_id: user.id,
      token,
      role,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (inviteError || !invite) {
    console.error('sendInvite error:', inviteError);
    return errorResponse('server_error', 'Failed to create invite', 500);
  }

  return NextResponse.json({
    ok: true,
    data: { inviteId: (invite as { id: string }).id, token },
  });
}
