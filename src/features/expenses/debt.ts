import type { ExpenseWithSplits } from './queries';

export interface DebtSummary {
  from: string; // userId — the person who owes
  to: string;   // userId — the person who is owed
  amount: number;
  currency: string;
}

/**
 * Given a list of expenses with splits, calculate net debts after simplification.
 * Returns the minimum transactions needed to settle all debts.
 *
 * Algorithm:
 *   1. For each currency, compute net balance per user:
 *      - Paying for an expense adds to your balance (you are owed that amount)
 *      - Being in a split subtracts from your balance (you owe that amount)
 *   2. Simplify to minimum transactions using greedy: largest creditor settles
 *      with largest debtor first.
 */
export function calculateDebts(expenses: ExpenseWithSplits[]): DebtSummary[] {
  // Map: currency → Map<userId, netBalance>
  // Positive balance = this user is owed money (creditor)
  // Negative balance = this user owes money (debtor)
  const balancesByCurrency = new Map<string, Map<string, number>>();

  for (const expense of expenses) {
    const currency = expense.currency;

    if (!balancesByCurrency.has(currency)) {
      balancesByCurrency.set(currency, new Map<string, number>());
    }
    const balances = balancesByCurrency.get(currency)!;

    // The payer fronted the full amount
    const currentPayer = balances.get(expense.paid_by_user_id) ?? 0;
    balances.set(expense.paid_by_user_id, currentPayer + expense.amount);

    // Each split participant owes their share
    for (const split of expense.splits) {
      const current = balances.get(split.user_id) ?? 0;
      balances.set(split.user_id, current - split.amount_owed);
    }
  }

  const result: DebtSummary[] = [];

  for (const [currency, balances] of balancesByCurrency) {
    // Separate into creditors (positive) and debtors (negative)
    const creditors: Array<{ userId: string; amount: number }> = [];
    const debtors: Array<{ userId: string; amount: number }> = [];

    for (const [userId, balance] of balances) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded > 0.005) {
        creditors.push({ userId, amount: rounded });
      } else if (rounded < -0.005) {
        debtors.push({ userId, amount: Math.abs(rounded) });
      }
    }

    // Sort descending so we always take the largest first
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Greedy minimum-transactions settlement
    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];

      const settled = Math.min(creditor.amount, debtor.amount);
      const settledRounded = Math.round(settled * 100) / 100;

      if (settledRounded > 0.005) {
        result.push({
          from: debtor.userId,
          to: creditor.userId,
          amount: settledRounded,
          currency,
        });
      }

      creditor.amount -= settled;
      debtor.amount -= settled;

      if (creditor.amount < 0.005) ci++;
      if (debtor.amount < 0.005) di++;
    }
  }

  return result;
}
