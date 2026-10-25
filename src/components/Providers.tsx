'use client';

import type { ReactNode } from 'react';
import { ExpenseActionsProvider } from '@/context/ExpenseActionsContext';
import { ExpensesProvider } from '@/context/ExpensesContext';
import { ToastProvider } from '@/context/ToastContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseActionsProvider>{children}</ExpenseActionsProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
