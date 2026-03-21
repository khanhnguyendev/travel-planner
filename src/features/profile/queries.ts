import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile } from '@/lib/types';

export interface ProfileWithStats extends Profile {
  tripCount: number;
  ownedTripCount: number;
}

export async function getProfileWithStats(userId: string): Promise<ProfileWithStats | null> {
  const supabase = await createClient();

  const [{ data: profile, error: profileError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('trip_members')
        .select('role')
        .eq('user_id', userId)
        .eq('invite_status', 'accepted'),
    ]);

  if (profileError || !profile) {
    console.error('getProfileWithStats error:', profileError);
    return null;
  }

  const trips = (memberships ?? []) as { role: string }[];
  const tripCount = trips.length;
  const ownedTripCount = trips.filter((m) => m.role === 'owner').length;

  return {
    ...(profile as Profile),
    tripCount,
    ownedTripCount,
  };
}

// -------------------------------------------------------
// Per-trip expense stats for the profile page
// -------------------------------------------------------

export interface TripExpenseStat {
  tripId: string;
  tripTitle: string;
  /** Total paid out by user (non-pool) for this trip */
  paid: number;
  /** Total share owed by user across all splits */
  share: number;
  /** Net = paid - share */
  net: number;
  currency: string;
}

export async function getUserExpenseStats(userId: string): Promise<TripExpenseStat[]> {
  const admin = createAdminClient();

  // Fetch all accepted trip memberships
  const { data: memberships } = await admin
    .from('trip_members')
    .select('trip_id')
    .eq('user_id', userId)
    .eq('invite_status', 'accepted');

  if (!memberships || memberships.length === 0) return [];

  const tripIds = memberships.map((m) => m.trip_id as string);

  // Fetch trip titles
  const { data: tripsData } = await admin
    .from('trips')
    .select('id, title')
    .in('id', tripIds);

  const tripMap = new Map(
    ((tripsData ?? []) as { id: string; title: string }[]).map((t) => [t.id, t.title])
  );

  // Fetch all expenses paid by user (non-pool) + splits for the user in parallel
  const [{ data: paidExpenses }, { data: splitsData }] = await Promise.all([
    admin
      .from('expenses')
      .select('trip_id, amount, currency')
      .in('trip_id', tripIds)
      .eq('paid_by_user_id', userId)
      .eq('paid_from_pool', false),
    admin
      .from('expense_splits')
      .select('expense_id, trip_id, amount_owed')
      .in('trip_id', tripIds)
      .eq('user_id', userId),
  ]);

  // For splits we need the currency — fetch the parent expenses
  const splitExpenseIds = ((splitsData ?? []) as { expense_id: string }[]).map((s) => s.expense_id);
  let expenseCurrencyMap: Record<string, string> = {};
  if (splitExpenseIds.length > 0) {
    const { data: expCurrencies } = await admin
      .from('expenses')
      .select('id, currency')
      .in('id', splitExpenseIds);
    expenseCurrencyMap = Object.fromEntries(
      ((expCurrencies ?? []) as { id: string; currency: string }[]).map((e) => [e.id, e.currency])
    );
  }

  // Build per-trip stats
  type Key = string; // `${tripId}|${currency}`
  const paidMap = new Map<Key, number>();
  const shareMap = new Map<Key, number>();

  for (const e of (paidExpenses ?? []) as { trip_id: string; amount: number; currency: string }[]) {
    const key = `${e.trip_id}|${e.currency}`;
    paidMap.set(key, (paidMap.get(key) ?? 0) + e.amount);
  }

  for (const s of (splitsData ?? []) as { expense_id: string; trip_id: string; amount_owed: number }[]) {
    const currency = expenseCurrencyMap[s.expense_id] ?? 'VND';
    const key = `${s.trip_id}|${currency}`;
    shareMap.set(key, (shareMap.get(key) ?? 0) + s.amount_owed);
  }

  const allKeys = new Set([...paidMap.keys(), ...shareMap.keys()]);

  const results: TripExpenseStat[] = [];
  for (const key of allKeys) {
    const [tripId, currency] = key.split('|');
    const tripTitle = tripMap.get(tripId);
    if (!tripTitle) continue;
    const p = paidMap.get(key) ?? 0;
    const s = shareMap.get(key) ?? 0;
    results.push({
      tripId,
      tripTitle,
      paid: p,
      share: s,
      net: Math.round((p - s) * 100) / 100,
      currency,
    });
  }

  results.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return results;
}
