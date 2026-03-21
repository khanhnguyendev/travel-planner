import { formatDate } from './format';
export const TRIP_TIMEZONE = 'Asia/Ho_Chi_Minh'; // GMT+7

/**
 * Returns the current date/time adjusted to the trip's local timezone.
 * Note: The returned Date object is intended for extracting local components 
 * (year, month, day, hours, minutes) using UTC methods (getUTCHours, etc.)
 * or for formatting.
 */
export function getTripNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TRIP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  
  return new Date(Date.UTC(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  ));
}

/**
 * Returns today's date in YYYY-MM-DD format based on the trip's local timezone.
 */
export function getTripTodayKey(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TRIP_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Returns a formatted string for a date in the trip's local timezone.
 */
export function formatInTripTimezone(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: TRIP_TIMEZONE,
  }).format(date);
}

/**
 * Returns the number of calendar days between two date strings (inclusive of both endpoints).
 */
export function daysBetween(start: string, end: string): number {
  const startMs = new Date(start + 'T00:00:00').getTime();
  const endMs = new Date(end + 'T00:00:00').getTime();
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
