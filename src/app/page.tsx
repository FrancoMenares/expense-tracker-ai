'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import CategoryChart from '@/components/CategoryChart';
import EmptyState from '@/components/EmptyState';
import ExpenseList from '@/components/ExpenseList';
import MonthlyChart from '@/components/MonthlyChart';
import SummaryCards from '@/components/SummaryCards';
import ExportDialog from '@/components/export/ExportDialog';
import { DownloadIcon } from '@/components/icons';
import { Card, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useExpenses } from '@/context/ExpensesContext';
import { getMonthlyTotals, getSummary, sortExpenses } from '@/lib/analytics';

export default function DashboardPage() {
  const { expenses, isLoading, loadError } = useExpenses();
  const [exportOpen, setExportOpen] = useState(false);

  const summary = useMemo(() => getSummary(expenses), [expenses]);
  const monthly = useMemo(() => getMonthlyTotals(expenses), [expenses]);
  const recent = useMemo(() => sortExpenses(expenses).slice(0, 5), [expenses]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="An overview of your spending."
        actions={
          <button onClick={() => setExportOpen(true)} disabled={isLoading || expenses.length === 0} className="btn-secondary">
            <DownloadIcon className="h-4 w-4" />
            Export data
          </button>
        }
      />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      {loadError && <ErrorBanner message={loadError} />}

      {isLoading ? (
        <DashboardSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCards summary={summary} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MonthlyChart data={monthly} />
            </div>
            <div className="lg:col-span-2">
              <CategoryChart data={summary.byCategory} total={summary.total} />
            </div>
          </div>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Recent expenses</h2>
              <Link href="/expenses" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                View all →
              </Link>
            </div>
            <ExpenseList expenses={recent} />
          </Card>
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
