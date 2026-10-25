'use client';

import type { ReactNode } from 'react';
import { CloudProvider } from '@/context/CloudContext';
import { ExpenseActionsProvider } from '@/context/ExpenseActionsContext';
import { ExpensesProvider } from '@/context/ExpensesContext';
import { ToastProvider } from '@/context/ToastContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <CloudProvider>
          <ExpenseActionsProvider>{children}</ExpenseActionsProvider>
        </CloudProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}
