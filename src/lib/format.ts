/**
 * Format a numeric amount as a currency string.
 * @param amount  The numeric amount (e.g. 12.5)
 * @param currency ISO 4217 currency code (e.g. "USD")
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format an ISO date string or Date object into a human-readable short date.
 * @param date ISO string or Date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}
