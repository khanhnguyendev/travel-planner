/**
 * Format a numeric amount as a currency string.
 * @param amount  The numeric amount (e.g. 12.5)
 * @param currency ISO 4217 currency code (e.g. "USD")
 */
// Currencies that don't use decimal places
const ZERO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW', 'IDR', 'HUF']);

export function formatCurrency(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
  // Use Vietnamese locale for VND so separators look natural (12.000.000 ₫)
  const locale = currency.toUpperCase() === 'VND' ? 'vi-VN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
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
