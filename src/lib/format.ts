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

function addGroupingSeparators(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatNumericInput(
  raw: string,
  { allowDecimals = true }: { allowDecimals?: boolean } = {}
): string {
  const base = raw.replace(/,/g, '');
  const sanitized = allowDecimals
    ? base.replace(/[^\d.]/g, '')
    : base.replace(/\D/g, '');

  if (!sanitized) return '';

  if (!allowDecimals) {
    return addGroupingSeparators(sanitized.replace(/^0+(?=\d)/, ''));
  }

  const hasDecimal = sanitized.includes('.');
  const [integerRaw = '', ...decimalRest] = sanitized.split('.');
  const decimalPart = decimalRest.join('');
  const integerPart = integerRaw.replace(/^0+(?=\d)/, '');
  const formattedInteger = integerPart ? addGroupingSeparators(integerPart) : (hasDecimal ? '0' : '');

  return hasDecimal ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

export function parseNumericInput(raw: string): number {
  const value = raw.replace(/,/g, '');
  return Number(value);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateTime(
  date: string | Date,
  { includeYear = true }: { includeYear?: boolean } = {}
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateAndTime(
  dateSource: string | Date,
  timeSource?: string | Date
): string {
  return `${formatDate(dateSource)} · ${formatTime(timeSource ?? dateSource)}`;
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

/**
 * Format a date with full precision (including seconds).
 */
export function formatFullDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d);
}
