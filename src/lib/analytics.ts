import { formatMonthKey, monthKey, sumAmounts, toCents, toISODate } from './format';
import { CATEGORIES, type Category, type Expense, type ExpenseFilters } from './types';

export interface CategoryTotal {
  category: Category;
  amount: number;
  count: number;
  percent: number;
}

export interface MonthlyTotal {
  key: string;
  label: string;
  amount: number;
}

export interface Summary {
  total: number;
  count: number;
  thisMonth: number;
  lastMonth: number;
  /** Percent change from last month, or null when last month had no spending. */
  monthChange: number | null;
  average: number;
  byCategory: CategoryTotal[];
  topCategory: CategoryTotal | null;
}

export function getCategoryTotals(expenses: Expense[]): CategoryTotal[] {
  const total = sumAmounts(expenses.map((e) => e.amount));
  return CATEGORIES.map((category) => {
    const items = expenses.filter((e) => e.category === category);
    const amount = sumAmounts(items.map((e) => e.amount));
    return { category, amount, count: items.length, percent: total > 0 ? (amount / total) * 100 : 0 };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function getSummary(expenses: Expense[], now = new Date()): Summary {
  const currentKey = monthKey(toISODate(now));
  const lastKey = monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));

  const total = sumAmounts(expenses.map((e) => e.amount));
  const thisMonth = sumAmounts(expenses.filter((e) => monthKey(e.date) === currentKey).map((e) => e.amount));
  const lastMonth = sumAmounts(expenses.filter((e) => monthKey(e.date) === lastKey).map((e) => e.amount));
  const byCategory = getCategoryTotals(expenses);

  return {
    total,
    count: expenses.length,
    thisMonth,
    lastMonth,
    monthChange: lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null,
    average: expenses.length > 0 ? total / expenses.length : 0,
    byCategory,
    topCategory: byCategory[0] ?? null,
  };
}

export function getMonthlyTotals(expenses: Expense[], months = 6, now = new Date()): MonthlyTotal[] {
  const result: MonthlyTotal[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    const amount = sumAmounts(expenses.filter((e) => monthKey(e.date) === key).map((e) => e.amount));
    result.push({ key, label: formatMonthKey(key), amount });
  }
  return result;
}

export function filterExpenses(expenses: Expense[], filters: ExpenseFilters): Expense[] {
  const query = filters.search.trim().toLowerCase();
  const filtered = expenses.filter((e) => {
    if (filters.category !== 'All' && e.category !== filters.category) return false;
    if (filters.startDate && e.date < filters.startDate) return false;
    if (filters.endDate && e.date > filters.endDate) return false;
    if (query && !e.description.toLowerCase().includes(query) && !e.category.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });
  return sortExpenses(filtered, filters.sort);
}

export function sortExpenses(expenses: Expense[], sort: ExpenseFilters['sort'] = 'date-desc'): Expense[] {
  const sorted = [...expenses];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'date-asc':
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      default:
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }
  });
  return sorted;
}

export interface BudgetStreak {
  days: number;
  dailyBudget: number;
  /** The next streak length worth celebrating. */
  nextMilestone: number;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];

/**
 * Counts consecutive days, ending today, on which total spending stayed within `dailyBudget`.
 * Days before the first recorded expense don't count, so a brand-new user starts at zero.
 */
export function getBudgetStreak(expenses: Expense[], dailyBudget: number, now = new Date()): BudgetStreak {
  const byDay = new Map<string, number>();
  for (const e of expenses) byDay.set(e.date, (byDay.get(e.date) ?? 0) + toCents(e.amount));
  const firstDay = expenses.reduce<string | null>((min, e) => (min === null || e.date < min ? e.date : min), null);
  const budgetCents = toCents(dailyBudget);

  let days = 0;
  if (firstDay) {
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let date = toISODate(cursor); date >= firstDay; date = toISODate(cursor)) {
      if ((byDay.get(date) ?? 0) > budgetCents) break;
      days++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const nextMilestone = STREAK_MILESTONES.find((m) => m > days) ?? Math.ceil((days + 1) / 365) * 365;
  return { days, dailyBudget, nextMilestone };
}
