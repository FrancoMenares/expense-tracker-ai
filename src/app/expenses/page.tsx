'use client';

import { useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ExpenseFiltersBar from '@/components/ExpenseFiltersBar';
import ExpenseList from '@/components/ExpenseList';
import ExportDialog from '@/components/export/ExportDialog';
import { DownloadIcon, SearchIcon } from '@/components/icons';
import { Card, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useExpenses } from '@/context/ExpensesContext';
import { filterExpenses } from '@/lib/analytics';
import { formatCurrency, sumAmounts } from '@/lib/format';
import { DEFAULT_FILTERS, type ExpenseFilters } from '@/lib/types';

export default function ExpensesPage() {
  const { expenses, isLoading, loadError } = useExpenses();
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);

  const filtered = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const filteredTotal = useMemo(() => sumAmounts(filtered.map((e) => e.amount)), [filtered]);

  const search = filters.search.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Search, filter, edit and export your expenses."
        actions={
          <button onClick={() => setExportOpen(true)} disabled={expenses.length === 0} className="btn-secondary">
            <DownloadIcon className="h-4 w-4" />
            Export
          </button>
        }
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initial={{
          startDate: filters.startDate,
          endDate: filters.endDate,
          categories: filters.category === 'All' ? undefined : [filters.category],
        }}
        notice={search ? `Date and category filters were carried over. Your search "${search}" is not applied to exports.` : undefined}
      />

      {loadError && <ErrorBanner message={loadError} />}

      {isLoading ? (
        <div className="space-y-4" aria-busy="true" aria-label="Loading expenses">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Card className="p-4 sm:p-5">
            <ExpenseFiltersBar filters={filters} onChange={setFilters} />
          </Card>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-900">{filtered.length}</span> of {expenses.length}{' '}
                expenses
              </p>
              <p className="text-sm text-slate-500">
                Total:{' '}
                <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(filteredTotal)}</span>
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <SearchIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-medium text-slate-900">No matching expenses</p>
                <p className="mt-1 text-sm text-slate-500">Try adjusting your search or filters.</p>
                <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn-secondary mt-4">
                  Clear filters
                </button>
              </div>
            ) : (
              <ExpenseList expenses={filtered} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
