'use client';

import { todayISO, toISODate } from '@/lib/format';
import { CATEGORIES, DEFAULT_FILTERS, type ExpenseFilters, type SortOption } from '@/lib/types';
import { SearchIcon, XIcon } from './icons';

interface Props {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  'date-desc': 'Newest first',
  'date-asc': 'Oldest first',
  'amount-desc': 'Highest amount',
  'amount-asc': 'Lowest amount',
};

function presetRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = todayISO();
  switch (preset) {
    case 'this-month':
      return { startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today };
    case 'last-month':
      return {
        startDate: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        endDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'last-30':
      return { startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)), endDate: today };
    case 'this-year':
      return { startDate: toISODate(new Date(now.getFullYear(), 0, 1)), endDate: today };
    default:
      return { startDate: '', endDate: '' };
  }
}

const PRESETS = [
  { id: 'all', label: 'All time' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'this-year', label: 'This year' },
];

export default function ExpenseFiltersBar({ filters, onChange }: Props) {
  const update = (patch: Partial<ExpenseFilters>) => onChange({ ...filters, ...patch });
  const isFiltered =
    filters.search !== '' || filters.category !== 'All' || filters.startDate !== '' || filters.endDate !== '';
  const rangeInvalid = filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
        <div className="relative sm:col-span-2 lg:col-span-4">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search descriptions…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="input pl-9"
            aria-label="Search expenses"
          />
        </div>
        <select
          value={filters.category}
          onChange={(e) => update({ category: e.target.value as ExpenseFilters['category'] })}
          className="input lg:col-span-2"
          aria-label="Filter by category"
        >
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.startDate}
          max={filters.endDate || undefined}
          onChange={(e) => update({ startDate: e.target.value })}
          className="input lg:col-span-2"
          aria-label="Start date"
        />
        <input
          type="date"
          value={filters.endDate}
          min={filters.startDate || undefined}
          onChange={(e) => update({ endDate: e.target.value })}
          className="input lg:col-span-2"
          aria-label="End date"
        />
        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as SortOption })}
          className="input lg:col-span-2"
          aria-label="Sort expenses"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => {
          const range = presetRange(p.id);
          const active = filters.startDate === range.startDate && filters.endDate === range.endDate;
          return (
            <button
              key={p.id}
              onClick={() => update(range)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {isFiltered && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <XIcon className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>
      {rangeInvalid && <p className="text-xs text-red-600">Start date is after end date, so no expenses match.</p>}
    </div>
  );
}
