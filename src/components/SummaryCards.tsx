import type { ReactNode } from 'react';
import type { Summary } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { CalendarIcon, TagIcon, TrendUpIcon, WalletIcon } from './icons';
import { Card } from './ui';

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  iconClass: string;
  footer?: ReactNode;
}

function StatCard({ label, value, icon, iconClass, footer }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {footer && <div className="mt-1 text-xs text-slate-500">{footer}</div>}
    </Card>
  );
}

export default function SummaryCards({ summary }: { summary: Summary }) {
  const change = summary.monthChange;
  const top = summary.topCategory;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total spending"
        value={formatCurrency(summary.total)}
        icon={<WalletIcon className="h-5 w-5" />}
        iconClass="bg-indigo-50 text-indigo-600"
        footer={`${summary.count} ${summary.count === 1 ? 'expense' : 'expenses'} recorded`}
      />
      <StatCard
        label="This month"
        value={formatCurrency(summary.thisMonth)}
        icon={<CalendarIcon className="h-5 w-5" />}
        iconClass="bg-sky-50 text-sky-600"
        footer={
          change === null ? (
            'No spending last month to compare'
          ) : (
            <span>
              <span className={change > 0 ? 'font-medium text-red-600' : 'font-medium text-emerald-600'}>
                {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
              </span>{' '}
              vs last month ({formatCurrency(summary.lastMonth)})
            </span>
          )
        }
      />
      <StatCard
        label="Average expense"
        value={formatCurrency(summary.average)}
        icon={<TrendUpIcon className="h-5 w-5" />}
        iconClass="bg-emerald-50 text-emerald-600"
        footer="Per transaction, all time"
      />
      <StatCard
        label="Top category"
        value={top ? `${CATEGORY_META[top.category].icon} ${top.category}` : '—'}
        icon={<TagIcon className="h-5 w-5" />}
        iconClass="bg-amber-50 text-amber-600"
        footer={top ? `${formatCurrency(top.amount)} · ${top.percent.toFixed(0)}% of total` : 'No data yet'}
      />
    </div>
  );
}
