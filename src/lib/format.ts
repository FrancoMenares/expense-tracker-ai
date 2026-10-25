const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return amount < 1000 ? currencyFormatter.format(amount) : compactCurrencyFormatter.format(amount);
}

/** Formats a Date as a local YYYY-MM-DD string (no timezone shift). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD string as a local date. */
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatDate(value: string): string {
  return parseISODate(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function monthKey(value: string): string {
  return value.slice(0, 7);
}

export function formatMonthKey(key: string, style: 'short' | 'long' = 'short'): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: style,
    year: style === 'long' ? 'numeric' : undefined,
  });
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((total, a) => total + toCents(a), 0) / 100;
}
