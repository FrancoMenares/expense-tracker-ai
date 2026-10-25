export const CATEGORIES = [
  'Food',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Bills',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, 'date' | 'amount' | 'category' | 'description'>;

export type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export interface ExpenseFilters {
  search: string;
  category: Category | 'All';
  startDate: string;
  endDate: string;
  sort: SortOption;
}

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  category: 'All',
  startDate: '',
  endDate: '',
  sort: 'date-desc',
};

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
