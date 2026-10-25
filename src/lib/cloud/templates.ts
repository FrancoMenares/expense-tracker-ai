import { formatCurrency, formatDate, formatMonthKey, monthKey, parseISODate, sumAmounts, toISODate } from '../format';
import { CATEGORIES, type Expense } from '../types';

export type TemplateId = 'tax-report' | 'monthly-summary' | 'category-analysis' | 'full-backup';
export type ColumnKind = 'text' | 'date' | 'currency' | 'percent' | 'number';
export type Cell = string | number | null;

export interface Column {
  /** Stable key used for JSON output. */
  key: string;
  label: string;
  kind: ColumnKind;
}

/** Inclusive YYYY-MM-DD bounds; empty string means unbounded. */
export interface Period {
  id: string;
  label: string;
  start: string;
  end: string;
}

export interface Highlight {
  label: string;
  value: string;
  hint?: string;
}

export interface TemplateOutput {
  templateId: TemplateId;
  title: string;
  periodLabel: string;
  columns: Column[];
  rows: Cell[][];
  highlights: Highlight[];
  /** Number of underlying expenses the output was built from. */
  recordCount: number;
}

export interface TemplateSpec {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  /** Tailwind gradient classes for the template's tile. */
  gradient: string;
  defaultFormat: 'csv' | 'json';
  /** Rolling labels for scheduled runs; index i maps to periods()[i]. */
  scheduleLabels: string[];
  /** Default scheduleLabels index (e.g. previous month for a monthly recap). */
  defaultScheduleIndex: number;
  periods: (expenses: Expense[], now: Date) => Period[];
  build: (expenses: Expense[], period: Period, now: Date) => TemplateOutput;
}

function inPeriod(e: Expense, p: Period): boolean {
  return (!p.start || e.date >= p.start) && (!p.end || e.date <= p.end);
}

function total(list: Expense[]): number {
  return sumAmounts(list.map((e) => e.amount));
}

function monthPeriod(year: number, month: number): Period {
  const key = monthKey(toISODate(new Date(year, month, 1)));
  return {
    id: `m${key}`,
    label: formatMonthKey(key, 'long'),
    start: toISODate(new Date(year, month, 1)),
    end: toISODate(new Date(year, month + 1, 0)),
  };
}

function byCategory(list: Expense[]) {
  return CATEGORIES.map((category) => {
    const items = list.filter((e) => e.category === category);
    return { category, items, amount: total(items) };
  });
}

const taxReport: TemplateSpec = {
  id: 'tax-report',
  name: 'Tax Report',
  tagline: 'Year-end ledger for your accountant',
  description: 'Every transaction in a calendar year, grouped by category, with quarterly totals.',
  emoji: '🧾',
  gradient: 'from-emerald-400 to-teal-600',
  defaultFormat: 'csv',
  scheduleLabels: ['Current year', 'Previous year'],
  defaultScheduleIndex: 0,
  periods: (expenses, now) => {
    const years = new Set([now.getFullYear(), now.getFullYear() - 1, ...expenses.map((e) => Number(e.date.slice(0, 4)))]);
    return [...years]
      .sort((a, b) => b - a)
      .map((y) => ({ id: `y${y}`, label: String(y), start: `${y}-01-01`, end: `${y}-12-31` }));
  },
  build: (expenses, period) => {
    const list = expenses
      .filter((e) => inPeriod(e, period))
      .sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || a.date.localeCompare(b.date));
    const quarters = [0, 1, 2, 3].map((q) =>
      total(list.filter((e) => Math.floor((Number(e.date.slice(5, 7)) - 1) / 3) === q)),
    );
    const busiest = quarters.indexOf(Math.max(...quarters));
    const top = byCategory(list).sort((a, b) => b.amount - a.amount)[0];
    return {
      templateId: 'tax-report',
      title: `Tax Report ${period.label}`,
      periodLabel: period.label,
      columns: [
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'description', label: 'Description', kind: 'text' },
        { key: 'amount', label: 'Amount', kind: 'currency' },
      ],
      rows: list.map((e) => [e.date, e.category, e.description, e.amount]),
      highlights: [
        { label: 'Total spent', value: formatCurrency(total(list)) },
        { label: 'Transactions', value: list.length.toLocaleString('en-US') },
        { label: 'Largest category', value: top && top.amount > 0 ? top.category : '—', hint: top && top.amount > 0 ? formatCurrency(top.amount) : undefined },
        { label: 'Busiest quarter', value: list.length ? `Q${busiest + 1}` : '—', hint: list.length ? formatCurrency(quarters[busiest]) : undefined },
      ],
      recordCount: list.length,
    };
  },
};

const monthlySummary: TemplateSpec = {
  id: 'monthly-summary',
  name: 'Monthly Summary',
  tagline: 'One-glance recap to share or file',
  description: 'Spending per category for a month, compared with the month before.',
  emoji: '📅',
  gradient: 'from-sky-400 to-indigo-600',
  defaultFormat: 'csv',
  scheduleLabels: ['Current month to date', 'Previous month'],
  defaultScheduleIndex: 1,
  periods: (_expenses, now) =>
    Array.from({ length: 12 }, (_, i) => monthPeriod(now.getFullYear(), now.getMonth() - i)),
  build: (expenses, period, now) => {
    const start = parseISODate(period.start);
    const prev = monthPeriod(start.getFullYear(), start.getMonth() - 1);
    const list = expenses.filter((e) => inPeriod(e, period));
    const prevList = expenses.filter((e) => inPeriod(e, prev));
    const sum = total(list);
    const prevSum = total(prevList);
    const prevByCat = new Map(byCategory(prevList).map((c) => [c.category, c.amount]));
    const rows = byCategory(list)
      .filter((c) => c.amount > 0 || (prevByCat.get(c.category) ?? 0) > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((c) => {
        const before = prevByCat.get(c.category) ?? 0;
        return [c.category, c.items.length, c.amount, sum > 0 ? (c.amount / sum) * 100 : 0, before > 0 ? ((c.amount - before) / before) * 100 : null];
      });
    const isCurrent = period.end >= toISODate(now) && period.start <= toISODate(now);
    const days = isCurrent ? now.getDate() : parseISODate(period.end).getDate();
    const largest = [...list].sort((a, b) => b.amount - a.amount)[0];
    const change = prevSum > 0 ? ((sum - prevSum) / prevSum) * 100 : null;
    return {
      templateId: 'monthly-summary',
      title: `Monthly Summary · ${period.label}`,
      periodLabel: period.label,
      columns: [
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'transactions', label: 'Transactions', kind: 'number' },
        { key: 'amount', label: 'Amount', kind: 'currency' },
        { key: 'share', label: 'Share', kind: 'percent' },
        { key: 'change', label: `vs ${prev.label.split(' ')[0]}`, kind: 'percent' },
      ],
      rows,
      highlights: [
        { label: 'Total spent', value: formatCurrency(sum) },
        { label: `vs ${prev.label}`, value: change === null ? '—' : `${change > 0 ? '+' : ''}${change.toFixed(1)}%`, hint: formatCurrency(prevSum) },
        { label: 'Daily average', value: formatCurrency(days > 0 ? sum / days : 0) },
        { label: 'Largest expense', value: largest ? formatCurrency(largest.amount) : '—', hint: largest?.description || largest?.category },
      ],
      recordCount: list.length,
    };
  },
};

const categoryAnalysis: TemplateSpec = {
  id: 'category-analysis',
  name: 'Category Analysis',
  tagline: 'Where the money really goes',
  description: 'Totals, frequency, average ticket and monthly run-rate for every category.',
  emoji: '📊',
  gradient: 'from-fuchsia-400 to-purple-600',
  defaultFormat: 'csv',
  scheduleLabels: ['Last 3 months', 'Last 6 months', 'Last 12 months', 'All time'],
  defaultScheduleIndex: 0,
  periods: (_expenses, now) => {
    const today = toISODate(now);
    const since = (months: number) => toISODate(new Date(now.getFullYear(), now.getMonth() - months + 1, 1));
    return [
      { id: 'last-3', label: 'Last 3 months', start: since(3), end: today },
      { id: 'last-6', label: 'Last 6 months', start: since(6), end: today },
      { id: 'last-12', label: 'Last 12 months', start: since(12), end: today },
      { id: 'all', label: 'All time', start: '', end: '' },
    ];
  },
  build: (expenses, period, now) => {
    const list = expenses.filter((e) => inPeriod(e, period));
    const sum = total(list);
    const first = period.start || list.reduce((min, e) => (e.date < min ? e.date : min), toISODate(now));
    const startDate = parseISODate(first);
    const months = Math.max(1, (now.getFullYear() - startDate.getFullYear()) * 12 + now.getMonth() - startDate.getMonth() + 1);
    const cats = byCategory(list).filter((c) => c.items.length > 0).sort((a, b) => b.amount - a.amount);
    const frequent = [...cats].sort((a, b) => b.items.length - a.items.length)[0];
    return {
      templateId: 'category-analysis',
      title: `Category Analysis · ${period.label}`,
      periodLabel: period.label,
      columns: [
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'total', label: 'Total', kind: 'currency' },
        { key: 'share', label: 'Share', kind: 'percent' },
        { key: 'transactions', label: 'Transactions', kind: 'number' },
        { key: 'averageTicket', label: 'Avg. ticket', kind: 'currency' },
        { key: 'monthlyAverage', label: 'Per month', kind: 'currency' },
      ],
      rows: cats.map((c) => [c.category, c.amount, sum > 0 ? (c.amount / sum) * 100 : 0, c.items.length, c.amount / c.items.length, c.amount / months]),
      highlights: [
        { label: 'Top category', value: cats[0]?.category ?? '—', hint: cats[0] ? formatCurrency(cats[0].amount) : undefined },
        { label: 'Most frequent', value: frequent?.category ?? '—', hint: frequent ? `${frequent.items.length} transactions` : undefined },
        { label: 'Total spent', value: formatCurrency(sum) },
        { label: 'Monthly run-rate', value: formatCurrency(sum / months), hint: `over ${months} ${months === 1 ? 'month' : 'months'}` },
      ],
      recordCount: list.length,
    };
  },
};

const fullBackup: TemplateSpec = {
  id: 'full-backup',
  name: 'Full Backup',
  tagline: 'Complete, restorable copy of your data',
  description: 'Every expense with all fields as JSON. Ideal for scheduled backups to cloud storage.',
  emoji: '🗄️',
  gradient: 'from-amber-400 to-orange-600',
  defaultFormat: 'json',
  scheduleLabels: ['All time'],
  defaultScheduleIndex: 0,
  periods: () => [{ id: 'all', label: 'All time', start: '', end: '' }],
  build: (expenses) => {
    const list = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
    return {
      templateId: 'full-backup',
      title: 'Full Backup',
      periodLabel: 'All time',
      columns: [
        { key: 'id', label: 'ID', kind: 'text' },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'category', label: 'Category', kind: 'text' },
        { key: 'amount', label: 'Amount', kind: 'currency' },
        { key: 'description', label: 'Description', kind: 'text' },
        { key: 'createdAt', label: 'Created', kind: 'text' },
        { key: 'updatedAt', label: 'Updated', kind: 'text' },
      ],
      rows: list.map((e) => [e.id, e.date, e.category, e.amount, e.description, e.createdAt, e.updatedAt]),
      highlights: [
        { label: 'Records', value: list.length.toLocaleString('en-US') },
        { label: 'Total', value: formatCurrency(total(list)) },
        { label: 'First entry', value: list[0] ? formatDate(list[0].date) : '—' },
        { label: 'Latest entry', value: list.length ? formatDate(list[list.length - 1].date) : '—' },
      ],
      recordCount: list.length,
    };
  },
};

export const TEMPLATES: Record<TemplateId, TemplateSpec> = {
  'tax-report': taxReport,
  'monthly-summary': monthlySummary,
  'category-analysis': categoryAnalysis,
  'full-backup': fullBackup,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

/** Resolves a stored period id against the template's current options, falling back to the default (first) one. */
export function resolvePeriod(templateId: TemplateId, periodId: string | undefined, expenses: Expense[], now: Date): Period {
  const periods = TEMPLATES[templateId].periods(expenses, now);
  return periods.find((p) => p.id === periodId) ?? periods[0];
}

export function formatCell(value: Cell, kind: ColumnKind): string {
  if (value === null || value === '') return '—';
  switch (kind) {
    case 'currency':
      return formatCurrency(Number(value));
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    case 'date':
      return formatDate(String(value));
    case 'number':
      return Number(value).toLocaleString('en-US');
    default:
      return String(value);
  }
}
