import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ProjectMember } from '@/lib/types';

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function errorResponse(code: string, message: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

// -------------------------------------------------------
// Schema
// -------------------------------------------------------

const splitSchema = z.object({
  userId: z.string().uuid(),
  amountOwed: z.number().nonnegative(),
});

const postExpenseSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1).max(10),
  expenseDate: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  paidByUserId: z.string().uuid(),
  splits: z.array(splitSchema).min(1),
  receiptPath: z.string().optional().nullable(),
});

// -------------------------------------------------------
// POST /api/expenses
// -------------------------------------------------------

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

  const parsed = postExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid', parsed.error.errors[0].message, 400);
  }

  const { projectId, title, amount, currency, expenseDate, note, paidByUserId, splits, receiptPath } = parsed.data;

  // Validate caller role (owner/admin/editor)
  const { data: callerMemberData } = await supabase
    .from('project_members')
    .select('role, invite_status')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .eq('invite_status', 'accepted')
    .single();

  const callerMember = callerMemberData as Pick<ProjectMember, 'role' | 'invite_status'> | null;
  if (!callerMember) {
    return errorResponse('forbidden', 'Not a member of this project', 403);
  }

  if (!['owner', 'admin', 'editor'].includes(callerMember.role)) {
    return errorResponse('forbidden', 'Insufficient role to create expenses', 403);
  }

  // Validate splits sum === amount
  const splitsTotal = splits.reduce((sum, s) => sum + s.amountOwed, 0);
  const diff = Math.abs(splitsTotal - amount);
  if (diff > 0.01) {
    return errorResponse('invalid', 'Splits total must equal the expense amount', 400);
  }

  const admin = createAdminClient();

  // Validate all user IDs (splits + paidBy) are accepted members
  const allUserIds = Array.from(new Set([paidByUserId, ...splits.map((s) => s.userId)]));

  const { data: membersData } = await admin
    .from('project_members')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('invite_status', 'accepted')
    .in('user_id', allUserIds);

  const acceptedIds = new Set((membersData ?? []).map((m) => (m as { user_id: string }).user_id));

  for (const uid of allUserIds) {
    if (!acceptedIds.has(uid)) {
      return errorResponse('invalid', `User ${uid} is not an accepted member of this project`, 400);
    }
  }

  // Check project is active
  const { data: projectData } = await admin
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .single();

  if ((projectData as { status: string } | null)?.status === 'archived') {
    return errorResponse('forbidden', 'Cannot add expenses to an archived project', 403);
  }

  // Create expense row
  const { data: expenseData, error: expenseError } = await admin
    .from('expenses')
    .insert({
      project_id: projectId,
      paid_by_user_id: paidByUserId,
      title,
      amount,
      currency,
      expense_date: expenseDate ?? new Date().toISOString(),
      note: note ?? null,
      receipt_path: receiptPath ?? null,
    })
    .select('id')
    .single();

  if (expenseError || !expenseData) {
    console.error('POST /api/expenses insert error:', expenseError);
    return errorResponse('server_error', 'Failed to create expense', 500);
  }

  const expenseId = (expenseData as unknown as { id: string }).id;

  // Create splits rows
  const splitRows = splits.map((s) => ({
    expense_id: expenseId,
    project_id: projectId,
    user_id: s.userId,
    amount_owed: s.amountOwed,
    status: 'pending' as const,
  }));

  const { error: splitsError } = await admin.from('expense_splits').insert(splitRows);

  if (splitsError) {
    console.error('POST /api/expenses splits insert error:', splitsError);
    // Best-effort rollback
    await admin.from('expenses').delete().eq('id', expenseId);
    return errorResponse('server_error', 'Failed to create expense splits', 500);
  }

  // Move receipt from temp path if needed
  let finalReceiptPath = receiptPath;
  if (receiptPath && receiptPath.includes('/temp/')) {
    const filename = receiptPath.split('/').pop() ?? 'receipt';
    finalReceiptPath = `project/${projectId}/expenses/${expenseId}/${filename}`;

    // Copy to final path
    const { error: copyError } = await admin.storage
      .from('receipts')
      .copy(receiptPath, finalReceiptPath);

    if (!copyError) {
      // Delete temp
      await admin.storage.from('receipts').remove([receiptPath]);

      // Update expense with final path
      await admin.from('expenses').update({ receipt_path: finalReceiptPath }).eq('id', expenseId);
    } else {
      console.error('Receipt copy error:', copyError);
    }
  }

  return NextResponse.json({ ok: true, data: { expenseId } });
}
