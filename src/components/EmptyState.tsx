'use client';

import { useExpenseActions } from '@/context/ExpenseActionsContext';
import { useExpenses } from '@/context/ExpensesContext';
import { useToast } from '@/context/ToastContext';
import { generateSampleExpenses } from '@/lib/sampleData';
import { PlusIcon, WalletIcon } from './icons';
import { Card } from './ui';

export default function EmptyState() {
  const { openAdd } = useExpenseActions();
  const { addMany } = useExpenses();
  const { showToast } = useToast();

  const loadSample = () => {
    try {
      addMany(generateSampleExpenses());
      showToast('Loaded 60 sample expenses');
    } catch {
      showToast('Could not save sample data.', 'error');
    }
  };

  return (
    <Card className="px-6 py-16 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <WalletIcon className="h-7 w-7" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">No expenses yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Start tracking where your money goes. Add your first expense, or load sample data to explore the app.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <button onClick={openAdd} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add your first expense
        </button>
        <button onClick={loadSample} className="btn-secondary">
          Load sample data
        </button>
      </div>
    </Card>
  );
}
