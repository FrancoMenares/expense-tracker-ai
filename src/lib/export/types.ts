import type { Category, Expense } from '../types';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  /** Inclusive YYYY-MM-DD bounds; empty string means unbounded. */
  startDate: string;
  endDate: string;
  categories: Category[];
  /** Base filename without extension. */
  filename: string;
}

export interface CategoryBreakdown {
  category: Category;
  count: number;
  amount: number;
}

export interface ExportSummary {
  count: number;
  total: number;
  /** Earliest and latest expense dates in the selection, or null when empty. */
  firstDate: string | null;
  lastDate: string | null;
  byCategory: CategoryBreakdown[];
}

/** Everything a format encoder needs to render a file. */
export interface ExportPayload {
  expenses: Expense[];
  summary: ExportSummary;
  options: ExportOptions;
  generatedAt: Date;
}

export type Encoder = (payload: ExportPayload) => Blob | Promise<Blob>;
