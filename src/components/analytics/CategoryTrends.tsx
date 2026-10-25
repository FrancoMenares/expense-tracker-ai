import { CATEGORY_META } from '@/lib/categories';
import { formatCurrency, formatMonthKey } from '@/lib/format';
import type { CategoryTrend } from '@/lib/insights';
import { Card } from '../ui';
import { SpendingDelta } from './shared';

const SPARK_W = 88;
const SPARK_H = 28;
const PAD = 5;

function Sparkline({ series, months, color, category }: { series: number[]; months: string[]; color: string; category: string }) {
  const max = Math.max(...series, 0);
  const step = series.length > 1 ? (SPARK_W - PAD * 2) / (series.length - 1) : 0;
  const points = series.map((v, i) => [PAD + i * step, SPARK_H - PAD - (max > 0 ? (v / max) * (SPARK_H - PAD * 2) : 0)] as const);
  const [lastX, lastY] = points[points.length - 1] ?? [0, 0];
  const summary = series.map((v, i) => `${formatMonthKey(months[i])} ${formatCurrency(v)}`).join(', ');
  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} role="img" aria-label={`${category} by month: ${summary}`}>
      <title>{summary}</title>
      <line x1={PAD} x2={SPARK_W - PAD} y1={SPARK_H - PAD} y2={SPARK_H - PAD} stroke="#e2e8f0" strokeWidth={1} />
      <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={4} fill={color} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

export default function CategoryTrends({ data, months }: { data: CategoryTrend[]; months: string[] }) {
  return (
    <Card>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="text-base font-semibold text-slate-900">Categories</h2>
        <p className="text-sm text-slate-500">Totals, monthly trend and change vs the same span before</p>
      </div>
      {data.length === 0 ? (
        <p className="py-14 text-center text-sm text-slate-400">No spending in this period</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-y border-slate-100 bg-slate-50/60">
                <th scope="col" className="py-2 pl-5 pr-3 text-left font-medium sm:pl-6">Category</th>
                <th scope="col" className="px-3 py-2 text-left font-medium">Trend</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Share</th>
                <th scope="col" className="py-2 pl-3 pr-5 text-right font-medium sm:pr-6">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((c) => (
                <tr key={c.category}>
                  <th scope="row" className="py-2.5 pl-5 pr-3 text-left font-medium text-slate-800 sm:pl-6">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: CATEGORY_META[c.category].color }} aria-hidden="true" />
                      {c.category}
                    </span>
                    <span className="block pl-[18px] text-xs font-normal text-slate-500">
                      {c.count} {c.count === 1 ? 'expense' : 'expenses'}
                    </span>
                  </th>
                  <td className="px-3 py-2.5">
                    <Sparkline series={c.series} months={months} color={CATEGORY_META[c.category].color} category={c.category} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">{formatCurrency(c.total)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600 sm:table-cell">{c.share.toFixed(0)}%</td>
                  <td className="py-2.5 pl-3 pr-5 text-right text-xs tabular-nums sm:pr-6">
                    <SpendingDelta change={c.change} />
                    <span className="block text-slate-400">was {formatCurrency(c.previous)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
