import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import type { WeekdayStat } from '@/lib/insights';
import { Card } from '../ui';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeekdayChart({ data }: { data: WeekdayStat[] }) {
  const max = Math.max(...data.map((d) => d.total), 0);
  const peak = max > 0 ? data.find((d) => d.total === max)?.day : undefined;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">By day of week</h2>
      <p className="text-sm text-slate-500">Total spent on each weekday</p>

      <ul className="mt-5 space-y-2.5" aria-label="Spending by day of week">
        {data.map((d) => {
          const description = `${DAY_NAMES[d.day]}: ${formatCurrency(d.total)} across ${d.count} ${d.count === 1 ? 'expense' : 'expenses'}${
            d.count ? `, ${formatCurrency(d.total / d.count)} on average` : ''
          }`;
          return (
            <li key={d.day} className="group flex items-center gap-3 text-sm" title={description} aria-label={description}>
              <span className={`w-9 flex-shrink-0 text-xs ${d.day === peak ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{d.label}</span>
              <div className="flex h-5 flex-1 items-center">
                <div
                  className={`h-full rounded-r transition-colors ${d.day === peak ? 'bg-indigo-600' : 'bg-indigo-300 group-hover:bg-indigo-400'}`}
                  style={{ width: max > 0 ? `${Math.max((d.total / max) * 100, d.total > 0 ? 1.5 : 0)}%` : 0 }}
                />
                <span className="ml-2 text-xs tabular-nums text-slate-600">{d.total > 0 ? formatCompactCurrency(d.total) : '—'}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
