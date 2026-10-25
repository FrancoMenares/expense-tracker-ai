'use client';

import { useExpenseActions } from '@/context/ExpenseActionsContext';
import { CATEGORY_META } from '@/lib/categories';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { PencilIcon, TrashIcon } from './icons';
import { CategoryBadge } from './ui';

function RowActions({ expense }: { expense: Expense }) {
  const { openEdit, requestDelete } = useExpenseActions();
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={() => openEdit(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
        aria-label={`Edit ${expense.description}`}
        title="Edit"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => requestDelete(expense)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
        aria-label={`Delete ${expense.description}`}
        title="Delete"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ExpenseList({ expenses }: { expenses: Expense[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Description</th>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id} className="transition hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{formatDate(e.date)}</td>
                <td className="max-w-xs truncate px-5 py-3.5 font-medium text-slate-900" title={e.description}>
                  {e.description}
                </td>
                <td className="px-5 py-3.5">
                  <CategoryBadge category={e.category} />
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(e.amount)}
                </td>
                <td className="w-24 px-3 py-2">
                  <RowActions expense={e} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {expenses.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
              {CATEGORY_META[e.category].icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{e.description}</p>
              <p className="text-xs text-slate-500">
                {formatDate(e.date)} · {e.category}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(e.amount)}</span>
              <RowActions expense={e} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
