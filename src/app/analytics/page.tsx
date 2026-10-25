'use client';

import { useMemo, useState, type ReactNode } from 'react';
import CategoryTrends from '@/components/analytics/CategoryTrends';
import InsightList from '@/components/analytics/InsightList';
import TrendChart from '@/components/analytics/TrendChart';
import WeekdayChart from '@/components/analytics/WeekdayChart';
import { SpendingDelta } from '@/components/analytics/shared';
import EmptyState from '@/components/EmptyState';
import { Card, ErrorBanner, PageHeader, Skeleton } from '@/components/ui';
import { useExpenses } from '@/context/ExpensesContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { RANGE_OPTIONS, getAnalytics, type RangeMonths } from '@/lib/insights';

export default function AnalyticsPage() {
  const { expenses, isLoading, loadError } = useExpenses();
  const [months, setMonths] = useState<RangeMonths>(6);

  const analytics = useMemo(() => getAnalytics(expenses, months), [expenses, months]);
  const { stats, window } = analytics;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle={`Trends and insights · ${formatDate(window.start)} – ${formatDate(window.end)}`}
        actions={<RangePicker value={months} onChange={setMonths} />}
      />

      {loadError && <ErrorBanner message={loadError} />}

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : expenses.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Total spent"
              value={formatCurrency(stats.total)}
              footer={
                <>
                  <SpendingDelta change={stats.change} /> vs {formatCurrency(stats.previous)} before
                </>
              }
            />
            <StatTile label="Monthly average" value={formatCurrency(stats.monthlyAverage)} footer={`Over ${months} months`} />
            <StatTile label="Daily average" value={formatCurrency(stats.dailyAverage)} footer={`Over ${stats.days} days`} />
            <StatTile
              label="Transactions"
              value={stats.count.toLocaleString('en-US')}
              footer={stats.count ? `${formatCurrency(stats.total / stats.count)} per expense` : 'None in this period'}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <TrendChart data={analytics.monthly} monthlyAverage={stats.monthlyAverage} />
            </div>
            <div className="lg:col-span-2">
              <InsightList insights={analytics.insights} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <CategoryTrends data={analytics.categories} months={window.months} />
            </div>
            <div className="lg:col-span-2">
              <WeekdayChart data={analytics.weekdays} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function RangePicker({ value, onChange }: { value: RangeMonths; onChange: (months: RangeMonths) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-sm" role="group" aria-label="Time range">
      {RANGE_OPTIONS.map((o) => (
        <button
          key={o.months}
          type="button"
          onClick={() => onChange(o.months)}
          aria-pressed={value === o.months}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.months ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatTile({ label, value, footer }: { label: string; value: string; footer: ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl" title={value}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{footer}</p>
    </Card>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[108px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
