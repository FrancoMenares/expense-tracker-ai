import type { MonthlyTotal } from '@/lib/analytics';
import { formatCompactCurrency, formatCurrency, formatMonthKey } from '@/lib/format';
import { Card } from './ui';

export default function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  const max = Math.max(...data.map((d) => d.amount), 0);
  const current = data[data.length - 1];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Monthly spending</h2>
          <p className="text-sm text-slate-500">Last {data.length} months</p>
        </div>
      </div>

      <div className="mt-6 flex h-56 items-end gap-2 sm:gap-4" role="list" aria-label="Monthly spending">
        {data.map((d) => {
          const height = max > 0 ? Math.max((d.amount / max) * 100, d.amount > 0 ? 3 : 0) : 0;
          const isCurrent = d.key === current?.key;
          return (
            <div
              key={d.key}
              role="listitem"
              aria-label={`${formatMonthKey(d.key, 'long')}: ${formatCurrency(d.amount)}`}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <span
                className={`text-xs font-medium tabular-nums transition ${
                  isCurrent ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-900'
                }`}
              >
                {d.amount > 0 ? formatCompactCurrency(d.amount) : ''}
              </span>
              <div className="flex w-full max-w-[56px] flex-1 items-end">
                <div
                  title={`${formatMonthKey(d.key, 'long')}: ${formatCurrency(d.amount)}`}
                  className={`w-full rounded-t-lg transition-all duration-500 ${
                    isCurrent ? 'bg-indigo-500' : 'bg-indigo-200 group-hover:bg-indigo-300'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className={`text-xs ${isCurrent ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
