'use client';

import EmptyState from '@/components/EmptyState';
import MonthlyInsights from '@/components/MonthlyInsights';
import { ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useExpenses } from '@/context/ExpensesContext';

export default function InsightsPage() {
  const { expenses, isLoading, loadError } = useExpenses();

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="How this month is shaping up." />

      {loadError && <ErrorBanner message={loadError} />}

      {isLoading ? (
        <Skeleton className="mx-auto h-[640px] max-w-lg rounded-2xl" />
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <MonthlyInsights expenses={expenses} />
      )}
    </div>
  );
}
