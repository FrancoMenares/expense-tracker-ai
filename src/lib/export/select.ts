import { sumAmounts } from '../format';
import { CATEGORIES, type Category, type Expense } from '../types';
import type { ExportOptions, ExportSummary } from './types';

type RangeOptions = Pick<ExportOptions, 'startDate' | 'endDate'>;
type ScopeOptions = RangeOptions & Pick<ExportOptions, 'search'>;

export function isValidRange({ startDate, endDate }: RangeOptions): boolean {
  return !startDate || !endDate || startDate <= endDate;
}

export function inDateRange(expense: Expense, { startDate, endDate }: RangeOptions): boolean {
  return (!startDate || expense.date >= startDate) && (!endDate || expense.date <= endDate);
}

/** Same matching rule as the expenses page search, so carried-over searches export what was on screen. */
export function matchesSearch(expense: Expense, search: string): boolean {
  const query = search.trim().toLowerCase();
  return !query || expense.description.toLowerCase().includes(query) || expense.category.toLowerCase().includes(query);
}

function inScope(expense: Expense, options: ScopeOptions): boolean {
  return inDateRange(expense, options) && matchesSearch(expense, options.search);
}

/** Expenses matching the options, oldest first (the natural order for a ledger export). */
export function selectExpenses(expenses: Expense[], options: ScopeOptions & Pick<ExportOptions, 'categories'>): Expense[] {
  const categories = new Set(options.categories);
  return expenses
    .filter((e) => categories.has(e.category) && inScope(e, options))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

/** Per-category counts within the date range and search, ignoring the category selection. Drives the category picker. */
export function countByCategory(expenses: Expense[], scope: ScopeOptions): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const e of expenses) if (inScope(e, scope)) counts[e.category]++;
  return counts;
}

/** Summarizes a selection; expects `selected` sorted by date as returned by selectExpenses. */
export function summarize(selected: Expense[]): ExportSummary {
  const byCategory = CATEGORIES.map((category) => {
    const items = selected.filter((e) => e.category === category);
    return { category, count: items.length, amount: sumAmounts(items.map((e) => e.amount)) };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    count: selected.length,
    total: sumAmounts(selected.map((e) => e.amount)),
    firstDate: selected[0]?.date ?? null,
    lastDate: selected[selected.length - 1]?.date ?? null,
    byCategory,
  };
}
