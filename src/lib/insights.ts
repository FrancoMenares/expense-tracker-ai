import { formatCurrency, formatMonthKey, monthKey, parseISODate, sumAmounts, toISODate } from './format';
import { CATEGORIES, type Category, type Expense } from './types';

export type RangeMonths = 3 | 6 | 12;

export const RANGE_OPTIONS: { months: RangeMonths; label: string }[] = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '12 months' },
];

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday-first display order, as most people read a week. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Inclusive YYYY-MM-DD window covering whole calendar months; the last month may be partial (to date). */
export interface Window {
  start: string;
  end: string;
  /** Month keys (YYYY-MM), oldest first. */
  months: string[];
}

export interface MonthBreakdown {
  key: string;
  label: string;
  total: number;
  count: number;
  byCategory: Record<Category, number>;
}

export interface CategoryTrend {
  category: Category;
  total: number;
  previous: number;
  /** Percent change vs the previous window, or null when the previous window had no spending. */
  change: number | null;
  share: number;
  count: number;
  /** Monthly totals aligned with Window.months. */
  series: number[];
}

export interface WeekdayStat {
  day: number;
  label: string;
  total: number;
  count: number;
}

export interface PeriodStats {
  total: number;
  previous: number;
  change: number | null;
  count: number;
  monthlyAverage: number;
  dailyAverage: number;
  /** Days elapsed in the window, up to today. */
  days: number;
}

export type InsightTone = 'up' | 'down' | 'neutral';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

export interface Analytics {
  window: Window;
  stats: PeriodStats;
  monthly: MonthBreakdown[];
  categories: CategoryTrend[];
  weekdays: WeekdayStat[];
  insights: Insight[];
}

function emptyByCategory(): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
}

function percentChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

function total(list: Expense[]): number {
  return sumAmounts(list.map((e) => e.amount));
}

/**
 * The last `months` calendar months ending today, and the window just before it. The current month is
 * partial, so the previous window is cut at the same day of its last month to compare like with like.
 */
export function getWindows(months: RangeMonths, now = new Date()): { current: Window; previous: Window } {
  const build = (offset: number, endDate: Date): Window => {
    const keys = Array.from({ length: months }, (_, i) =>
      monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - offset - months + 1 + i, 1))),
    );
    return { start: `${keys[0]}-01`, end: toISODate(endDate), months: keys };
  };
  return {
    current: build(0, now),
    previous: build(months, sameDayMonthsAgo(now, months)),
  };
}

function sameDayMonthsAgo(now: Date, months: number): Date {
  const lastDay = new Date(now.getFullYear(), now.getMonth() - months + 1, 0).getDate();
  return new Date(now.getFullYear(), now.getMonth() - months, Math.min(now.getDate(), lastDay));
}

function inWindow(e: Expense, w: Window): boolean {
  return e.date >= w.start && e.date <= w.end;
}

function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function getMonthlyBreakdown(list: Expense[], w: Window): MonthBreakdown[] {
  const byMonth = new Map(
    w.months.map((key) => [key, { key, label: formatMonthKey(key), total: 0, count: 0, byCategory: emptyByCategory() }]),
  );
  // Sum in cents to avoid floating point drift, then convert once.
  for (const e of list) {
    const m = byMonth.get(monthKey(e.date));
    if (!m) continue;
    m.total += Math.round(e.amount * 100);
    m.byCategory[e.category] += Math.round(e.amount * 100);
    m.count++;
  }
  return [...byMonth.values()].map((m) => ({
    ...m,
    total: m.total / 100,
    byCategory: Object.fromEntries(CATEGORIES.map((c) => [c, m.byCategory[c] / 100])) as Record<Category, number>,
  }));
}

export function getCategoryTrends(current: Expense[], previous: Expense[], monthly: MonthBreakdown[]): CategoryTrend[] {
  const sum = total(current);
  return CATEGORIES.map((category) => {
    const items = current.filter((e) => e.category === category);
    const amount = total(items);
    const before = total(previous.filter((e) => e.category === category));
    return {
      category,
      total: amount,
      previous: before,
      change: percentChange(amount, before),
      share: sum > 0 ? (amount / sum) * 100 : 0,
      count: items.length,
      series: monthly.map((m) => m.byCategory[category]),
    };
  })
    .filter((c) => c.total > 0 || c.previous > 0)
    .sort((a, b) => b.total - a.total);
}

export function getWeekdayPattern(list: Expense[]): WeekdayStat[] {
  const stats = WEEKDAY_LABELS.map((label, day) => ({ day, label, cents: 0, count: 0 }));
  for (const e of list) {
    const s = stats[parseISODate(e.date).getDay()];
    s.cents += Math.round(e.amount * 100);
    s.count++;
  }
  return WEEKDAY_ORDER.map((day) => {
    const { label, cents, count } = stats[day];
    return { day, label, total: cents / 100, count };
  });
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatPercent(value: number): string {
  return `${Math.abs(value).toFixed(0)}%`;
}

/** Plain-language observations, most actionable first. Each one is only emitted when the data supports it. */
export function getInsights(expenses: Expense[], a: Omit<Analytics, 'insights'>, now = new Date()): Insight[] {
  const insights: Insight[] = [];

  // Month-end projection from the current run-rate.
  const today = toISODate(now);
  const currentKey = monthKey(today);
  const lastKey = monthKey(toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const soFar = total(expenses.filter((e) => monthKey(e.date) === currentKey && e.date <= today));
  const lastMonth = total(expenses.filter((e) => monthKey(e.date) === lastKey));
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  // Too few days make the run-rate meaningless (one rent payment on the 1st would project 30x).
  if (soFar > 0 && dayOfMonth >= 5) {
    const projected = (soFar / dayOfMonth) * daysInMonth;
    const change = percentChange(projected, lastMonth);
    insights.push({
      id: 'projection',
      tone: change === null ? 'neutral' : change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      title: `On track for ${formatCurrency(projected)} this month`,
      detail:
        change === null
          ? `${formatCurrency(soFar)} spent in the first ${dayOfMonth} days.`
          : `${formatCurrency(soFar)} so far; that pace is ${formatPercent(change)} ${change >= 0 ? 'above' : 'below'} last month (${formatCurrency(lastMonth)}).`,
    });
  }

  // Biggest category movers vs the previous window. Ignore tiny bases so $2 -> $10 isn't "+400%".
  const comparable = a.categories.filter((c) => c.change !== null && c.previous >= 20);
  const riser = [...comparable].sort((x, y) => (y.change ?? 0) - (x.change ?? 0))[0];
  if (riser && (riser.change ?? 0) >= 15) {
    insights.push({
      id: 'riser',
      tone: 'up',
      title: `${riser.category} is up ${formatPercent(riser.change!)}`,
      detail: `${formatCurrency(riser.total)} vs ${formatCurrency(riser.previous)} in the same span before.`,
    });
  }
  const faller = [...comparable].sort((x, y) => (x.change ?? 0) - (y.change ?? 0))[0];
  if (faller && (faller.change ?? 0) <= -15) {
    insights.push({
      id: 'faller',
      tone: 'down',
      title: `${faller.category} is down ${formatPercent(faller.change!)}`,
      detail: `${formatCurrency(faller.total)} vs ${formatCurrency(faller.previous)} in the same span before.`,
    });
  }

  const current = expenses.filter((e) => inWindow(e, a.window));

  // Recurring descriptions are usually subscriptions or habits worth knowing about.
  const groups = new Map<string, { label: string; count: number; cents: number }>();
  for (const e of current) {
    const key = e.description.trim().toLowerCase();
    if (!key) continue;
    const g = groups.get(key) ?? { label: e.description.trim(), count: 0, cents: 0 };
    g.count++;
    g.cents += Math.round(e.amount * 100);
    groups.set(key, g);
  }
  const habit = [...groups.values()].filter((g) => g.count >= 3).sort((x, y) => y.cents - x.cents)[0];
  if (habit) {
    insights.push({
      id: 'habit',
      tone: 'neutral',
      title: `“${habit.label}” added up to ${formatCurrency(habit.cents / 100)}`,
      detail: `${habit.count} times in this period, ${formatCurrency(habit.cents / 100 / habit.count)} on average.`,
    });
  }

  // Busiest weekday by total, only when it stands out from an even spread.
  const weekTotal = a.weekdays.reduce((s, d) => s + d.total, 0);
  const busiest = [...a.weekdays].sort((x, y) => y.total - x.total)[0];
  if (busiest && weekTotal > 0 && busiest.total / weekTotal >= 0.2) {
    insights.push({
      id: 'weekday',
      tone: 'neutral',
      title: `${WEEKDAY_NAMES[busiest.day]}s are your biggest spending day`,
      detail: `${formatPercent((busiest.total / weekTotal) * 100)} of spending in this period (${formatCurrency(busiest.total)} over ${busiest.count} ${busiest.count === 1 ? 'expense' : 'expenses'}).`,
    });
  }

  const largest = [...current].sort((x, y) => y.amount - x.amount)[0];
  if (largest) {
    insights.push({
      id: 'largest',
      tone: 'neutral',
      title: `Largest expense: ${formatCurrency(largest.amount)}`,
      detail: `${largest.description.trim() || largest.category} on ${parseISODate(largest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
    });
  }

  return insights;
}

export function getAnalytics(expenses: Expense[], months: RangeMonths, now = new Date()): Analytics {
  const { current: window, previous: prevWindow } = getWindows(months, now);
  const current = expenses.filter((e) => inWindow(e, window));
  const previous = expenses.filter((e) => inWindow(e, prevWindow));

  const monthly = getMonthlyBreakdown(current, window);
  const sum = total(current);
  const prevSum = total(previous);
  const days = daysBetween(window.start, window.end);
  const stats: PeriodStats = {
    total: sum,
    previous: prevSum,
    change: percentChange(sum, prevSum),
    count: current.length,
    monthlyAverage: sum / months,
    dailyAverage: days > 0 ? sum / days : 0,
    days,
  };

  const base = {
    window,
    stats,
    monthly,
    categories: getCategoryTrends(current, previous, monthly),
    weekdays: getWeekdayPattern(current),
  };
  return { ...base, insights: getInsights(expenses, base, now) };
}

/** A round axis maximum (1, 2, 2.5, 5 × 10^n) at or above `value`. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}
