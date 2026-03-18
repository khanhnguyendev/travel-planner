import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TripMember } from '@/lib/types';

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

const postReceiptSchema = z.object({
  tripId: z.string().uuid(),
  expenseId: z.string().uuid().optional().nullable(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
});

// POST /api/uploads/receipt
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

  const parsed = postReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { tripId, expenseId, filename } = parsed.data;

  // Validate caller role (owner/admin/editor)
  const { data: callerMemberData } = await supabase
    .from('trip_members')
    .select('role, invite_status')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerMember = callerMemberData as Pick<TripMember, 'role' | 'invite_status'> | null;
  if (!callerMember) {
    return errorResponse('forbidden', 'Not a member of this trip', 403);
  }

  if (!['owner', 'admin', 'editor'].includes(callerMember.role)) {
    return errorResponse('forbidden', 'Insufficient role to upload receipts', 403);
  }

  // Sanitize filename — keep only safe characters
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const segment = expenseId ?? 'temp';
  const receiptPath = `trip/${tripId}/expenses/${segment}/${safeName}`;

  const admin = createAdminClient();

  // Create a signed upload URL (valid for 5 minutes)
  const { data: signedData, error: signedError } = await admin.storage
    .from('receipts')
    .createSignedUploadUrl(receiptPath, { upsert: true });

  if (signedError || !signedData) {
    console.error('createSignedUploadUrl error:', signedError);
    return errorResponse('server_error', 'Failed to generate upload URL', 500);
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  return NextResponse.json({
    ok: true,
    data: {
      uploadUrl: signedData.signedUrl,
      receiptPath,
      expiresAt,
    },
  });
}
