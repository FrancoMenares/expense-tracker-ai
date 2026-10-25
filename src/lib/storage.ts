import { isCategory, type Expense } from './types';

export const STORAGE_KEY = 'expense-tracker:expenses:v1';

export class StorageError extends Error {}

function isValidExpense(value: unknown): value is Expense {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === 'string' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.amount === 'number' &&
    Number.isFinite(e.amount) &&
    isCategory(e.category) &&
    typeof e.description === 'string'
  );
}

export function loadExpenses(): Expense[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new StorageError('Your browser is blocking local storage, so expenses cannot be loaded.');
  }
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StorageError('Saved expense data is corrupted and could not be read.');
  }
  if (!Array.isArray(parsed)) return [];

  const now = new Date().toISOString();
  return parsed.filter(isValidExpense).map((e) => ({
    ...e,
    createdAt: e.createdAt ?? now,
    updatedAt: e.updatedAt ?? now,
  }));
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    throw new StorageError('Could not save to local storage. It may be full or disabled.');
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
