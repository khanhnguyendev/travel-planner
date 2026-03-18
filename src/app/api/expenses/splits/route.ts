import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ExpenseSplit, TripMember, SplitStatus } from '@/lib/types';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// -------------------------------------------------------
// Schema
// -------------------------------------------------------

const patchSplitSchema = z.object({
  splitId: z.string().uuid(),
  status: z.enum(['settled', 'pending']),
});

// -------------------------------------------------------
// PATCH /api/expenses/splits
// -------------------------------------------------------

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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

  const parsed = patchSplitSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { splitId, status } = parsed.data;

  const admin = createAdminClient();

  // Fetch the split to validate ownership / trip membership
  const { data: splitData, error: splitError } = await admin
    .from('expense_splits')
    .select('*')
    .eq('id', splitId)
    .single();

  if (splitError || !splitData) {
    return errorResponse('not_found', 'Split not found', 404);
  }

  const split = splitData as unknown as ExpenseSplit;

  // Check caller is split owner OR trip owner/admin
  const isSplitOwner = split.user_id === user.id;

  if (!isSplitOwner) {
    // Check if caller is trip owner or admin
    const { data: memberData } = await admin
      .from('trip_members')
      .select('role, invite_status')
      .eq('trip_id', split.trip_id)
      .eq('user_id', user.id)
      .eq('invite_status', 'accepted')
      .single();

    const member = memberData as Pick<TripMember, 'role' | 'invite_status'> | null;

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return errorResponse(
        'forbidden',
        'Only the split owner or a trip owner/admin can update this split',
        403
      );
    }
  }

  // Update the split status
  const { error: updateError } = await admin
    .from('expense_splits')
    .update({ status: status as SplitStatus })
    .eq('id', splitId);

  if (updateError) {
    console.error('PATCH /api/expenses/splits update error:', updateError);
    return errorResponse('server_error', 'Failed to update split status', 500);
  }

  return NextResponse.json({ ok: true });
}
