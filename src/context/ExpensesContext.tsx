'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { generateId, loadExpenses, saveExpenses, STORAGE_KEY, StorageError } from '@/lib/storage';
import type { Expense, ExpenseInput } from '@/lib/types';

interface ExpensesContextValue {
  expenses: Expense[];
  isLoading: boolean;
  /** Set when stored data could not be loaded. */
  loadError: string | null;
  /** All mutations throw StorageError if the change could not be persisted. */
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => void;
  addMany: (expenses: Expense[]) => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

function errorMessage(err: unknown): string {
  return err instanceof StorageError ? err.message : 'Something went wrong while loading your expenses.';
}

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const current = useRef<Expense[]>([]);

  const reload = useCallback(() => {
    try {
      const list = loadExpenses();
      current.current = list;
      setExpenses(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // Keep multiple open tabs in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  const commit = useCallback((next: Expense[]) => {
    saveExpenses(next); // throws before state changes if persisting fails
    current.current = next;
    setExpenses(next);
    setLoadError(null);
  }, []);

  const addExpense = useCallback(
    (input: ExpenseInput) => {
      const now = new Date().toISOString();
      const expense: Expense = { ...input, id: generateId(), createdAt: now, updatedAt: now };
      commit([...current.current, expense]);
      return expense;
    },
    [commit],
  );

  const updateExpense = useCallback(
    (id: string, input: ExpenseInput) => {
      const now = new Date().toISOString();
      commit(current.current.map((e) => (e.id === id ? { ...e, ...input, updatedAt: now } : e)));
    },
    [commit],
  );

  const deleteExpense = useCallback(
    (id: string) => commit(current.current.filter((e) => e.id !== id)),
    [commit],
  );

  const addMany = useCallback((list: Expense[]) => commit([...current.current, ...list]), [commit]);

  const value = useMemo(
    () => ({
      expenses,
      isLoading,
      loadError,
      addExpense,
      updateExpense,
      deleteExpense,
      addMany,
    }),
    [expenses, isLoading, loadError, addExpense, updateExpense, deleteExpense, addMany],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error('useExpenses must be used within ExpensesProvider');
  return ctx;
}
