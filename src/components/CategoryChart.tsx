import type { CategoryTotal } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import { Card } from './ui';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.5;

export default function CategoryChart({ data, total }: { data: CategoryTotal[]; total: number }) {
  let offset = 0;
  const segments = data.map((d) => {
    const length = (d.percent / 100) * CIRCUMFERENCE;
    const segment = { ...d, length, offset };
    offset += length;
    return segment;
  });

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Spending by category</h2>
      <p className="text-sm text-slate-500">All time</p>

      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No data yet</p>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative h-40 w-40 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth="12" />
              {segments.map((s) => (
                <circle
                  key={s.category}
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  stroke={CATEGORY_META[s.category].color}
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(s.length - (segments.length > 1 ? GAP : 0), 0.5)} ${CIRCUMFERENCE}`}
                  strokeDashoffset={-s.offset}
                >
                  <title>{`${s.category}: ${formatCurrency(s.amount)} (${s.percent.toFixed(1)}%)`}</title>
                </circle>
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-slate-500">Total</span>
              <span className="text-lg font-semibold text-slate-900 tabular-nums">{formatCompactCurrency(total)}</span>
            </div>
          </div>

          <ul className="w-full space-y-3">
            {data.map((d) => (
              <li key={d.category}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[d.category].color }} />
                    {d.category}
                  </span>
                  <span className="tabular-nums text-slate-900">
                    {formatCurrency(d.amount)}
                    <span className="ml-1.5 text-xs text-slate-400">{d.percent.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.percent}%`, backgroundColor: CATEGORY_META[d.category].color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
