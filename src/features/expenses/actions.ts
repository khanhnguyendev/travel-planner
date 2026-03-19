'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireEditor } from '@/lib/membership';
import { logActivity } from '@/lib/activity';
import type { ActionResult } from '@/features/auth/actions';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface SplitInput {
  userId: string;
  amountOwed: number;
}

export interface CreateExpenseInput {
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  expenseDate?: string | null;
  note?: string | null;
  category?: string | null;
  paidByUserId: string;
  paidFromPool?: boolean;
  splits: SplitInput[];
  receiptPath?: string | null;
  placeId?: string | null;
}

export interface UpdateExpenseInput {
  title?: string;
  amount?: number;
  currency?: string;
  expenseDate?: string | null;
  note?: string | null;
  paidByUserId?: string;
  receiptPath?: string | null;
  placeId?: string | null;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Move a storage object from a temp path to a final path.
 * Uses copy + delete because Supabase Storage does not expose a rename/move API directly.
 */
async function moveReceiptToFinalPath(
  admin: ReturnType<typeof createAdminClient>,
  tempPath: string,
  finalPath: string
): Promise<void> {
  const { error: copyError } = await admin.storage
    .from('receipts')
    .copy(tempPath, finalPath);

  if (copyError) {
    console.error('Receipt copy error:', copyError);
    return;
  }

  const { error: deleteError } = await admin.storage
    .from('receipts')
    .remove([tempPath]);

  if (deleteError) {
    console.error('Receipt delete (after copy) error:', deleteError);
  }
}

// -------------------------------------------------------
// createExpense
// -------------------------------------------------------

export async function createExpense(
  input: CreateExpenseInput
): Promise<ActionResult<{ expenseId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const { tripId, title, amount, currency, expenseDate, note, category, paidByUserId, paidFromPool, splits, receiptPath, placeId } = input;

  // Caller must be editor or above
  const callerRole = await requireEditor(tripId, user.id);
  if (!callerRole) return { ok: false, error: 'Not a member of this trip or insufficient permissions' };

  // Validate splits total
  const splitsTotal = splits.reduce((sum, s) => sum + s.amountOwed, 0);
  const diff = Math.abs(splitsTotal - amount);
  if (diff > 0.01) {
    return { ok: false, error: 'Splits total must equal the expense amount' };
  }

  const admin = createAdminClient();

  // Validate all split user IDs and paidByUserId are accepted members
  const allUserIds = Array.from(new Set([paidByUserId, ...splits.map((s) => s.userId)]));
  const { data: membersData } = await admin
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('invite_status', 'accepted')
    .in('user_id', allUserIds);

  const acceptedIds = new Set((membersData ?? []).map((m) => (m as { user_id: string }).user_id));

  for (const uid of allUserIds) {
    if (!acceptedIds.has(uid)) {
      return { ok: false, error: `User ${uid} is not an accepted member of this trip` };
    }
  }

  // Insert expense row
  const { data: expenseData, error: expenseError } = await admin
    .from('expenses')
    .insert({
      trip_id: tripId,
      paid_by_user_id: paidByUserId,
      paid_from_pool: paidFromPool ?? false,
      title,
      amount,
      currency,
      expense_date: expenseDate ?? new Date().toISOString(),
      note: note ?? null,
      category: category ?? null,
      receipt_path: receiptPath ?? null,
      place_id: placeId ?? null,
    })
    .select('id')
    .single();

  if (expenseError || !expenseData) {
    console.error('createExpense insert error:', expenseError);
    return { ok: false, error: 'Failed to create expense' };
  }

  const expenseId = (expenseData as unknown as { id: string }).id;

  // Insert all expense_splits rows
  const splitRows = splits.map((s) => ({
    expense_id: expenseId,
    trip_id: tripId,
    user_id: s.userId,
    amount_owed: s.amountOwed,
    status: 'pending' as const,
  }));

  const { error: splitsError } = await admin.from('expense_splits').insert(splitRows);

  if (splitsError) {
    console.error('createExpense splits insert error:', splitsError);
    // Best-effort rollback: delete the expense row
    await admin.from('expenses').delete().eq('id', expenseId);
    return { ok: false, error: 'Failed to create expense splits' };
  }

  // Move receipt from temp path if needed
  if (receiptPath && receiptPath.includes('/temp/')) {
    const filename = receiptPath.split('/').pop() ?? 'receipt';
    const finalPath = `trip/${tripId}/expenses/${expenseId}/${filename}`;
    await moveReceiptToFinalPath(admin, receiptPath, finalPath);

    // Update expense with final receipt path
    await admin
      .from('expenses')
      .update({ receipt_path: finalPath })
      .eq('id', expenseId);
  }

  void logActivity({
    tripId,
    userId: user.id,
    action: 'expense.add',
    entityType: 'expense',
    entityId: expenseId,
    meta: { title, amount, currency },
  });

  revalidatePath(`/trips/${tripId}/expenses`);

  return { ok: true, data: { expenseId } };
}

// -------------------------------------------------------
// updateExpense
// -------------------------------------------------------

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  // Fetch existing expense to get trip_id for membership check + revalidation
  const { data: existingData } = await admin
    .from('expenses')
    .select('id, trip_id')
    .eq('id', id)
    .single();

  if (!existingData) {
    return { ok: false, error: 'Expense not found' };
  }

  const existing = existingData as unknown as { id: string; trip_id: string };

  const editorRole = await requireEditor(existing.trip_id, user.id);
  if (!editorRole) return { ok: false, error: 'Insufficient permissions' };

  const updatePayload: Record<string, unknown> = {};
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.amount !== undefined) updatePayload.amount = input.amount;
  if (input.currency !== undefined) updatePayload.currency = input.currency;
  if (input.expenseDate !== undefined) updatePayload.expense_date = input.expenseDate;
  if (input.note !== undefined) updatePayload.note = input.note;
  if (input.paidByUserId !== undefined) updatePayload.paid_by_user_id = input.paidByUserId;
  if (input.receiptPath !== undefined) updatePayload.receipt_path = input.receiptPath;
  if (input.placeId !== undefined) updatePayload.place_id = input.placeId;

  const { error } = await admin
    .from('expenses')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    console.error('updateExpense error:', error);
    return { ok: false, error: 'Failed to update expense' };
  }

  revalidatePath(`/trips/${existing.trip_id}/expenses`);
  revalidatePath(`/trips/${existing.trip_id}/expenses/${id}`);

  return { ok: true, data: undefined };
}

// -------------------------------------------------------
// deleteExpense
// -------------------------------------------------------

export async function deleteExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Not authenticated' };
  }

  const admin = createAdminClient();

  // Fetch trip_id for membership check + revalidation
  const { data: expenseData } = await admin
    .from('expenses')
    .select('id, trip_id, title')
    .eq('id', id)
    .single();

  const expense = expenseData as unknown as { id: string; trip_id: string; title: string } | null;
  if (!expense) return { ok: false, error: 'Expense not found' };

  const editorRole = await requireEditor(expense.trip_id, user.id);
  if (!editorRole) return { ok: false, error: 'Insufficient permissions' };

  // Delete splits first (FK constraint)
  await admin.from('expense_splits').delete().eq('expense_id', id);

  const { error } = await admin.from('expenses').delete().eq('id', id);

  if (error) {
    console.error('deleteExpense error:', error);
    return { ok: false, error: 'Failed to delete expense' };
  }

  revalidatePath(`/trips/${expense.trip_id}/expenses`);
  revalidatePath(`/trips/${expense.trip_id}`);
  void logActivity({
    tripId: expense.trip_id,
    userId: user.id,
    action: 'expense.delete',
    entityType: 'expense',
    entityId: id,
    meta: { title: expense.title },
  });

  return { ok: true, data: undefined };
}
