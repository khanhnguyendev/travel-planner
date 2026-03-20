import type { ExpenseWithSplits } from './queries';

export interface MemberBalance {
  userId: string;
  currency: string;
  /** Positive = owed back, Negative = owes others */
  net: number;
  paid: number;
  share: number;
}

/**
 * Calculate net balance per member per currency based on expense splits.
 * Positive net = member is owed money back.
 * Negative net = member owes others money.
 */
export function calculateMemberBalances(
  expenses: ExpenseWithSplits[]
): MemberBalance[] {
  // currency → userId → { paid, share }
  const byCurrency = new Map<string, Map<string, { paid: number; share: number }>>();

  function getUser(currency: string, userId: string) {
    if (!byCurrency.has(currency)) byCurrency.set(currency, new Map());
    const map = byCurrency.get(currency)!;
    if (!map.has(userId)) map.set(userId, { paid: 0, share: 0 });
    return map.get(userId)!;
  }

  for (const expense of expenses) {
    const cur = expense.currency;
    // Pool expenses: pool pays, no individual payer gets credit.
    // Personal expenses: payer fronted the money and is owed back.
    if (!expense.paid_from_pool) {
      getUser(cur, expense.paid_by_user_id).paid += expense.amount;
    }
    for (const split of expense.splits) {
      getUser(cur, split.user_id).share += split.amount_owed;
    }
  }

  const results: MemberBalance[] = [];
  for (const [currency, userMap] of byCurrency) {
    for (const [userId, { paid, share }] of userMap) {
      const net = Math.round((paid - share) * 100) / 100;
      results.push({ userId, currency, net, paid, share });
    }
  }
  return results;
}

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

    // We only care about PENDING splits.
    // If a split is settled, the money has already been moved or accounted for.
    for (const split of expense.splits) {
      if (split.status !== 'pending') continue;

      // The debtor owes the amount
      const currentDebtor = balances.get(split.user_id) ?? 0;
      balances.set(split.user_id, currentDebtor - split.amount_owed);

      // The creditor is either the Payer or the Pool
      const creditorId = expense.paid_from_pool ? 'pool' : expense.paid_by_user_id;

      // If the payer is the one who owes (individual share), it's a wash for person-to-person debt.
      // But we still track it for the balance calc.
      // Wait, if I pay 100, and my share is 50, and my share is "pending" (which it shouldn't be),
      // I don't owe myself.
      const currentCreditor = balances.get(creditorId) ?? 0;
      balances.set(creditorId, currentCreditor + split.amount_owed);
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
