import { formatDate } from './format';

/**
 * Returns the number of calendar days between two date strings (inclusive of both endpoints).
 */
export function daysBetween(start: string, end: string): number {
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  return Math.round(Math.abs(endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Returns a formatted date range string, e.g. "Jun 1 – Jun 10, 2025 (10 days)".
 */
export function formatDateRange(start: string, end: string): string {
  const days = daysBetween(start, end);
  return `${formatDate(start)} – ${formatDate(end)} (${days} day${days !== 1 ? 's' : ''})`;
}

export function getTripDurationLabel(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;

  const days = daysBetween(start, end);
  const nights = Math.max(days - 1, 0);
  const dayLabel = `${days} day${days === 1 ? '' : 's'}`;
  const nightLabel = `${nights} night${nights === 1 ? '' : 's'}`;

  return `${dayLabel} · ${nightLabel}`;
}
