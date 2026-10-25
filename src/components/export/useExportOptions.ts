import { useReducer } from 'react';
import { toISODate } from '@/lib/format';
import type { ExportFormat, ExportOptions } from '@/lib/export';
import { CATEGORIES, type Category } from '@/lib/types';

export type PresetId = 'all' | 'this-month' | 'last-30' | 'last-90' | 'ytd' | 'custom';

export const DATE_PRESETS: { id: Exclude<PresetId, 'custom'>; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'this-month', label: 'This month' },
  { id: 'last-30', label: 'Last 30 days' },
  { id: 'last-90', label: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date' },
];

export function presetRange(id: Exclude<PresetId, 'custom'>, now = new Date()): { startDate: string; endDate: string } {
  const today = toISODate(now);
  const daysAgo = (n: number) => toISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  switch (id) {
    case 'all':
      return { startDate: '', endDate: '' };
    case 'this-month':
      return { startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: today };
    case 'last-30':
      return { startDate: daysAgo(29), endDate: today };
    case 'last-90':
      return { startDate: daysAgo(89), endDate: today };
    case 'ytd':
      return { startDate: toISODate(new Date(now.getFullYear(), 0, 1)), endDate: today };
  }
}

export function suggestFilename({ startDate, endDate }: Pick<ExportOptions, 'startDate' | 'endDate'>, now = new Date()): string {
  if (!startDate && !endDate) return `expenses-${toISODate(now)}`;
  return `expenses-${startDate || 'start'}-to-${endDate || toISODate(now)}`;
}

export interface ExportState extends ExportOptions {
  preset: PresetId;
  /** Once the user edits the filename we stop regenerating it from the date range. */
  filenameEdited: boolean;
}

type Action =
  | { type: 'format'; format: ExportFormat }
  | { type: 'preset'; preset: Exclude<PresetId, 'custom'> }
  | { type: 'date'; field: 'startDate' | 'endDate'; value: string }
  | { type: 'toggleCategory'; category: Category }
  | { type: 'categories'; categories: Category[] }
  | { type: 'search'; search: string }
  | { type: 'filename'; filename: string };

function withSuggestedFilename(state: ExportState): ExportState {
  return state.filenameEdited ? state : { ...state, filename: suggestFilename(state) };
}

function reducer(state: ExportState, action: Action): ExportState {
  switch (action.type) {
    case 'format':
      return { ...state, format: action.format };
    case 'preset':
      return withSuggestedFilename({ ...state, ...presetRange(action.preset), preset: action.preset });
    case 'date':
      return withSuggestedFilename({ ...state, [action.field]: action.value, preset: 'custom' });
    case 'toggleCategory': {
      const has = state.categories.includes(action.category);
      const next = has ? state.categories.filter((c) => c !== action.category) : [...state.categories, action.category];
      // Keep canonical order so filters and the PDF header read consistently.
      return { ...state, categories: CATEGORIES.filter((c) => next.includes(c)) };
    }
    case 'categories':
      return { ...state, categories: action.categories };
    case 'search':
      return { ...state, search: action.search };
    case 'filename':
      return { ...state, filename: action.filename, filenameEdited: true };
  }
}

export interface ExportInitialOptions {
  startDate?: string;
  endDate?: string;
  categories?: Category[];
  search?: string;
}

function init(initial: ExportInitialOptions): ExportState {
  const startDate = initial.startDate ?? '';
  const endDate = initial.endDate ?? '';
  const preset = DATE_PRESETS.find((p) => {
    const range = presetRange(p.id);
    return range.startDate === startDate && range.endDate === endDate;
  });
  return {
    format: 'csv',
    startDate,
    endDate,
    preset: preset?.id ?? 'custom',
    categories: initial.categories ?? [...CATEGORIES],
    search: initial.search ?? '',
    filename: suggestFilename({ startDate, endDate }),
    filenameEdited: false,
  };
}

export function useExportOptions(initial: ExportInitialOptions = {}) {
  return useReducer(reducer, initial, init);
}
