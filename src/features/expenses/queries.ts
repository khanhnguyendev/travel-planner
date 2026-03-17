import { createClient } from '@/lib/supabase/server';
import type { Expense, ExpenseSplit, Profile } from '@/lib/types';

export type ExpenseSplitWithProfile = ExpenseSplit & {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
};

export type ExpenseWithSplits = Expense & {
  paid_by_profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
  splits: ExpenseSplitWithProfile[];
};

/**
 * Returns all expenses for a project ordered by expense_date desc.
 */
export async function getExpenses(projectId: string): Promise<Expense[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false });

  if (error) {
    console.error('getExpenses error:', error);
    return [];
  }

  return (data ?? []) as unknown as Expense[];
}

/**
 * Returns all expenses for a project with their splits and member profiles joined.
 * Used for debt calculation on the expenses list page.
 */
export async function getExpensesWithSplits(
  projectId: string
): Promise<ExpenseWithSplits[]> {
  const supabase = await createClient();

  const { data: expensesData, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('expense_date', { ascending: false });

  if (expensesError || !expensesData || expensesData.length === 0) {
    if (expensesError) console.error('getExpensesWithSplits error:', expensesError);
    return [];
  }

  const expenses = expensesData as unknown as Expense[];
  const expenseIds = expenses.map((e) => e.id);

  // Collect all relevant user IDs
  const paidByIds = expenses.map((e) => e.paid_by_user_id);

  // Fetch all splits for these expenses
  const { data: splitsData } = await supabase
    .from('expense_splits')
    .select('*')
    .in('expense_id', expenseIds);

  const splits = (splitsData as unknown as ExpenseSplit[]) ?? [];
  const splitUserIds = splits.map((s) => s.user_id);

  // Fetch all profiles needed
  const allUserIds = Array.from(new Set([...paidByIds, ...splitUserIds]));
  let profilesMap: Record<string, Pick<Profile, 'id' | 'display_name' | 'avatar_url'>> = {};

  if (allUserIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', allUserIds);

    const profiles =
      (profilesData as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]) ?? [];
    profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  }

  // Group splits by expense_id
  const splitsByExpenseId: Record<string, ExpenseSplit[]> = {};
  for (const split of splits) {
    if (!splitsByExpenseId[split.expense_id]) {
      splitsByExpenseId[split.expense_id] = [];
    }
    splitsByExpenseId[split.expense_id].push(split);
  }

  return expenses.map((expense) => {
    const expenseSplits = (splitsByExpenseId[expense.id] ?? []).map((split) => ({
      ...split,
      profile: profilesMap[split.user_id] ?? {
        id: split.user_id,
        display_name: null,
        avatar_url: null,
      },
    }));

    return {
      ...expense,
      paid_by_profile: profilesMap[expense.paid_by_user_id] ?? {
        id: expense.paid_by_user_id,
        display_name: null,
        avatar_url: null,
      },
      splits: expenseSplits,
    };
  });
}

/**
 * Returns a single expense with its splits and member profiles joined.
 */
export async function getExpense(id: string): Promise<ExpenseWithSplits | null> {
  const supabase = await createClient();

  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (expenseError || !expenseData) {
    console.error('getExpense error:', expenseError);
    return null;
  }

  const expense = expenseData as unknown as Expense;

  // Fetch paid_by profile
  const { data: paidByData } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', expense.paid_by_user_id)
    .single();

  const paidByProfile = (paidByData as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>) ?? {
    id: expense.paid_by_user_id,
    display_name: null,
    avatar_url: null,
  };

  // Fetch splits with profiles
  const { data: splitsData, error: splitsError } = await supabase
    .from('expense_splits')
    .select('*')
    .eq('expense_id', id);

  if (splitsError) {
    console.error('getExpense splits error:', splitsError);
  }

  const splits = splitsData as unknown as ExpenseSplit[] ?? [];

  // Fetch profiles for all split users
  const userIds = splits.map((s) => s.user_id);
  let profilesMap: Record<string, Pick<Profile, 'id' | 'display_name' | 'avatar_url'>> = {};

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    const profiles = (profilesData as unknown as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]) ?? [];
    profilesMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
  }

  const splitsWithProfiles: ExpenseSplitWithProfile[] = splits.map((split) => ({
    ...split,
    profile: profilesMap[split.user_id] ?? {
      id: split.user_id,
      display_name: null,
      avatar_url: null,
    },
  }));

  return {
    ...expense,
    paid_by_profile: paidByProfile,
    splits: splitsWithProfiles,
  };
}
