import type { ExpenseWithSplits } from './queries';
import type { BudgetContribution } from '@/lib/types';
import { calculateMemberBalances, calculateDebts } from './debt';
import type { MemberBalance, DebtSummary } from './debt';

// -------------------------------------------------------
// Category emoji map (mirrors expense-form.tsx constants)
// -------------------------------------------------------

const CATEGORY_EMOJI: Record<string, string> = {
  Accommodation: '🛏️',
  Entertainment: '🎤',
  Groceries: '🛒',
  Healthcare: '🦷',
  Insurance: '🧯',
  'Rent & Charges': '🏠',
  'Restaurants & Bars': '🍔',
  Shopping: '🛍️',
  Transport: '🚕',
  Other: '🤚',
};

export function categoryEmoji(category: string | null): string {
  if (!category) return '💸';
  return CATEGORY_EMOJI[category] ?? '💸';
}

// -------------------------------------------------------
// Trip report
// -------------------------------------------------------

export interface CategoryBreakdownEntry {
  category: string;
  emoji: string;
  amount: number;
  currency: string;
  count: number;
  percent: number; // 0–100, of total for that currency
}

export interface MemberReportEntry {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  paid: number;
  share: number;
  net: number;
  currency: string;
}

export interface DailySpendEntry {
  date: string; // ISO date string YYYY-MM-DD
  amount: number;
  currency: string;
}

export interface TripExpenseReport {
  totalByCurrency: Record<string, number>;
  poolSpendByCurrency: Record<string, number>;
  personalSpendByCurrency: Record<string, number>;
  categoryBreakdown: CategoryBreakdownEntry[];
  memberBreakdown: MemberReportEntry[];
  memberBalances: MemberBalance[];
  debts: DebtSummary[];
  topExpenses: ExpenseWithSplits[];
  dailySpend: DailySpendEntry[];
  expenseCount: number;
}

export function buildTripExpenseReport(
  expenses: ExpenseWithSplits[],
  contributions: BudgetContribution[],
  memberProfiles: { id: string; display_name: string | null; avatar_url: string | null }[]
): TripExpenseReport {
  const profileMap = Object.fromEntries(memberProfiles.map((p) => [p.id, p]));

  // Totals by currency
  const totalByCurrency: Record<string, number> = {};
  const poolSpendByCurrency: Record<string, number> = {};
  const personalSpendByCurrency: Record<string, number> = {};

  // Category breakdown: currency → category → { amount, count }
  const categoryMap = new Map<string, Map<string, { amount: number; count: number }>>();

  // Daily spend: currency → date → amount
  const dailyMap = new Map<string, Map<string, number>>();

  for (const exp of expenses) {
    const cur = exp.currency;
    totalByCurrency[cur] = (totalByCurrency[cur] ?? 0) + exp.amount;

    if (exp.paid_from_pool) {
      poolSpendByCurrency[cur] = (poolSpendByCurrency[cur] ?? 0) + exp.amount;
    } else {
      personalSpendByCurrency[cur] = (personalSpendByCurrency[cur] ?? 0) + exp.amount;
    }

    // Category
    const cat = exp.category ?? 'Other';
    if (!categoryMap.has(cur)) categoryMap.set(cur, new Map());
    const catByCur = categoryMap.get(cur)!;
    const existing = catByCur.get(cat) ?? { amount: 0, count: 0 };
    catByCur.set(cat, { amount: existing.amount + exp.amount, count: existing.count + 1 });

    // Daily
    const day = exp.expense_date
      ? exp.expense_date.slice(0, 10)
      : exp.created_at.slice(0, 10);
    if (!dailyMap.has(cur)) dailyMap.set(cur, new Map());
    const dayByCur = dailyMap.get(cur)!;
    dayByCur.set(day, (dayByCur.get(day) ?? 0) + exp.amount);
  }

  // Build category breakdown
  const categoryBreakdown: CategoryBreakdownEntry[] = [];
  for (const [currency, catByCur] of categoryMap) {
    const total = totalByCurrency[currency] ?? 1;
    for (const [category, { amount, count }] of catByCur) {
      categoryBreakdown.push({
        category,
        emoji: categoryEmoji(category),
        amount,
        currency,
        count,
        percent: Math.round((amount / total) * 100),
      });
    }
  }
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // Build daily spend (sorted by date)
  const dailySpend: DailySpendEntry[] = [];
  for (const [currency, dayByCur] of dailyMap) {
    for (const [date, amount] of dayByCur) {
      dailySpend.push({ date, amount, currency });
    }
  }
  dailySpend.sort((a, b) => a.date.localeCompare(b.date));

  // Member balances + debts
  const memberBalances = calculateMemberBalances(expenses);
  const debts = calculateDebts(expenses);

  // Build member breakdown from balances
  const memberBreakdown: MemberReportEntry[] = memberBalances.map((b) => {
    const profile = profileMap[b.userId];
    return {
      userId: b.userId,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      paid: b.paid,
      share: b.share,
      net: b.net,
      currency: b.currency,
    };
  });

  // Top 5 expenses by amount
  const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  return {
    totalByCurrency,
    poolSpendByCurrency,
    personalSpendByCurrency,
    categoryBreakdown,
    memberBreakdown,
    memberBalances,
    debts,
    topExpenses,
    dailySpend,
    expenseCount: expenses.length,
  };
}

// -------------------------------------------------------
// CSV export
// -------------------------------------------------------

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildExpensesCsv(
  expenses: ExpenseWithSplits[],
  memberProfiles: { id: string; display_name: string | null }[]
): string {
  const nameMap = new Map(memberProfiles.map((p) => [p.id, p.display_name ?? p.id]));

  const headers = ['Date', 'Title', 'Category', 'Amount', 'Currency', 'Paid By', 'From Pool', 'Split With', 'Notes'];

  const rows = expenses.map((exp) => {
    const paidBy = nameMap.get(exp.paid_by_user_id) ?? exp.paid_by_user_id;
    const splitWith = exp.splits
      .map((s) => `${nameMap.get(s.user_id) ?? s.user_id} (${s.amount_owed})`)
      .join('; ');
    const date = exp.expense_date ? exp.expense_date.slice(0, 10) : '';
    return [
      escapeCsv(date),
      escapeCsv(exp.title),
      escapeCsv(exp.category),
      escapeCsv(exp.amount),
      escapeCsv(exp.currency),
      escapeCsv(paidBy),
      escapeCsv(exp.paid_from_pool ? 'Yes' : 'No'),
      escapeCsv(splitWith),
      escapeCsv(exp.note),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// -------------------------------------------------------
// Per-user transaction report
// -------------------------------------------------------

export interface UserCategoryEntry {
  category: string;
  emoji: string;
  amount: number;
  currency: string;
  percent: number;
}

export interface UserTransactionReport {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Expenses this user personally paid out (non-pool) */
  paidExpenses: ExpenseWithSplits[];
  /** Total paid out per currency */
  totalPaidByCurrency: Record<string, number>;
  /** Total owed (pending splits) per currency */
  totalPendingByCurrency: Record<string, number>;
  /** Total settled per currency */
  totalSettledByCurrency: Record<string, number>;
  /** Total contributed to pool per currency */
  totalContributedByCurrency: Record<string, number>;
  /** Spend breakdown by category for expenses paid by this user */
  categoryBreakdown: UserCategoryEntry[];
  /** Net balance per currency */
  netByCurrency: Record<string, number>;
}

export function buildUserTransactionReport(
  userId: string,
  profile: { display_name: string | null; avatar_url: string | null } | null,
  expenses: ExpenseWithSplits[],
  contributions: BudgetContribution[]
): UserTransactionReport {
  const paidExpenses = expenses.filter(
    (e) => !e.paid_from_pool && e.paid_by_user_id === userId
  );

  const totalPaidByCurrency: Record<string, number> = {};
  const totalPendingByCurrency: Record<string, number> = {};
  const totalSettledByCurrency: Record<string, number> = {};
  const catMap = new Map<string, Map<string, number>>();

  for (const exp of paidExpenses) {
    const cur = exp.currency;
    totalPaidByCurrency[cur] = (totalPaidByCurrency[cur] ?? 0) + exp.amount;

    const cat = exp.category ?? 'Other';
    if (!catMap.has(cur)) catMap.set(cur, new Map());
    const catByCur = catMap.get(cur)!;
    catByCur.set(cat, (catByCur.get(cat) ?? 0) + exp.amount);
  }

  // Splits owed by this user
  for (const exp of expenses) {
    for (const split of exp.splits) {
      if (split.user_id !== userId) continue;
      const cur = exp.currency;
      if (split.status === 'pending') {
        totalPendingByCurrency[cur] = (totalPendingByCurrency[cur] ?? 0) + split.amount_owed;
      } else {
        totalSettledByCurrency[cur] = (totalSettledByCurrency[cur] ?? 0) + split.amount_owed;
      }
    }
  }

  // Pool contributions
  const totalContributedByCurrency: Record<string, number> = {};
  for (const c of contributions.filter((c) => c.user_id === userId)) {
    totalContributedByCurrency[c.currency] =
      (totalContributedByCurrency[c.currency] ?? 0) + c.amount;
  }

  // Category breakdown
  const categoryBreakdown: UserCategoryEntry[] = [];
  for (const [currency, catByCur] of catMap) {
    const total = totalPaidByCurrency[currency] ?? 1;
    for (const [category, amount] of catByCur) {
      categoryBreakdown.push({
        category,
        emoji: categoryEmoji(category),
        amount,
        currency,
        percent: Math.round((amount / total) * 100),
      });
    }
  }
  categoryBreakdown.sort((a, b) => b.amount - a.amount);

  // Net balance: paid out - share owed
  const netByCurrency: Record<string, number> = {};
  const allCurrencies = new Set([
    ...Object.keys(totalPaidByCurrency),
    ...Object.keys(totalPendingByCurrency),
    ...Object.keys(totalSettledByCurrency),
  ]);
  for (const cur of allCurrencies) {
    const paid = totalPaidByCurrency[cur] ?? 0;
    const pending = totalPendingByCurrency[cur] ?? 0;
    const settled = totalSettledByCurrency[cur] ?? 0;
    netByCurrency[cur] = Math.round((paid - pending - settled) * 100) / 100;
  }

  return {
    userId,
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    paidExpenses,
    totalPaidByCurrency,
    totalPendingByCurrency,
    totalSettledByCurrency,
    totalContributedByCurrency,
    categoryBreakdown,
    netByCurrency,
  };
}
