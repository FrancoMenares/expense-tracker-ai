'use client';

import { useState } from 'react';
import { CATEGORY_META } from '@/lib/categories';
import { formatCompactCurrency, formatCurrency, formatMonthKey } from '@/lib/format';
import { niceMax, type MonthBreakdown } from '@/lib/insights';
import { CATEGORIES, type Category } from '@/lib/types';
import { Card } from '../ui';
import { ChartTableToggle, Legend } from './shared';

interface TrendChartProps {
  data: MonthBreakdown[];
  monthlyAverage: number;
}

export default function TrendChart({ data, monthlyAverage }: TrendChartProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [active, setActive] = useState<number | null>(null);

  const present = CATEGORIES.filter((c) => data.some((m) => m.byCategory[c] > 0));
  const max = niceMax(Math.max(...data.map((m) => m.total), monthlyAverage));
  const peak = data.reduce((best, m, i) => (m.total > data[best].total ? i : best), 0);
  const last = data.length - 1;
  // Label the cap only where it tells the story: the peak and the current month (every month when there are few).
  const labelled = (i: number) => data.length <= 4 || i === peak || i === last;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Spending trend</h2>
          <p className="text-sm text-slate-500">Monthly totals by category · current month to date</p>
        </div>
        <ChartTableToggle view={view} onChange={setView} />
      </div>

      {view === 'table' ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Monthly spending by category</caption>
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr className="border-b border-slate-200">
                <th scope="col" className="py-2 pr-3 text-left font-medium">Month</th>
                {present.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 text-right font-medium">{c}</th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 tabular-nums">
              {data.map((m) => (
                <tr key={m.key}>
                  <th scope="row" className="whitespace-nowrap py-2 pr-3 text-left font-medium text-slate-700">
                    {formatMonthKey(m.key, 'long')}
                  </th>
                  {present.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-2 text-right text-slate-600">
                      {m.byCategory[c] > 0 ? formatCurrency(m.byCategory[c]) : '—'}
                    </td>
                  ))}
                  <td className="whitespace-nowrap py-2 pl-3 text-right font-medium text-slate-900">{formatCurrency(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <Legend categories={present} className="mt-4" />

          <div className="mt-4 flex gap-3">
            {/* Y axis */}
            <div className="relative h-56 w-12 flex-shrink-0 text-right text-[11px] tabular-nums text-slate-400" aria-hidden="true">
              {[max, max / 2, 0].map((tick, i) => (
                <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${i * 50}%` }}>
                  {formatCompactCurrency(tick).replace('.00', '')}
                </span>
              ))}
            </div>

            <div className="relative min-w-0 flex-1 pr-14">
              {/* Gridlines */}
              <div className="pointer-events-none absolute inset-x-0 right-14 top-0 h-56" aria-hidden="true">
                {[0, 50].map((top) => (
                  <div key={top} className="absolute inset-x-0 h-px bg-slate-100" style={{ top: `${top}%` }} />
                ))}
                <div className="absolute inset-x-0 bottom-0 h-px bg-slate-300" />
                {monthlyAverage > 0 && (
                  <div className="absolute inset-x-0 h-px bg-slate-400" style={{ bottom: `${(monthlyAverage / max) * 100}%` }}>
                    <span className="absolute left-full top-0 ml-1.5 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium leading-none text-slate-500">
                      Avg {formatCompactCurrency(monthlyAverage)}
                    </span>
                  </div>
                )}
              </div>

              <div className="relative flex h-56 items-end" role="list" aria-label="Monthly spending by category">
                {data.map((m, i) => (
                  <div
                    key={m.key}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`${formatMonthKey(m.key, 'long')}: ${formatCurrency(m.total)}${present
                      .filter((c) => m.byCategory[c] > 0)
                      .map((c) => `, ${c} ${formatCurrency(m.byCategory[c])}`)
                      .join('')}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end rounded-md outline-none focus-visible:bg-indigo-50/60"
                  >
                    {active === i && <div className="absolute inset-0 rounded-md bg-slate-100/70" aria-hidden="true" />}
                    {m.total > 0 && labelled(i) && (
                      <span className="relative mb-1 text-[11px] font-medium tabular-nums text-slate-600">
                        {formatCompactCurrency(m.total)}
                      </span>
                    )}
                    <div
                      className="relative flex w-full max-w-[24px] flex-col-reverse gap-[2px]"
                      style={{ height: `${(m.total / max) * 100}%` }}
                    >
                      {present
                        .filter((c) => m.byCategory[c] > 0)
                        .map((c, idx, arr) => (
                          <div
                            key={c}
                            className={idx === arr.length - 1 ? 'rounded-t' : ''}
                            style={{ flexGrow: m.byCategory[c], flexBasis: 0, minHeight: 2, backgroundColor: CATEGORY_META[c].color }}
                          />
                        ))}
                    </div>
                    {active === i && <Tooltip month={m} categories={present} alignRight={i > data.length / 2} />}
                  </div>
                ))}
              </div>

              {/* X axis */}
              <div className="mt-2 flex" aria-hidden="true">
                {data.map((m, i) => (
                  <span key={m.key} className={`flex-1 text-center text-xs ${i === last ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function Tooltip({ month, categories, alignRight }: { month: MonthBreakdown; categories: Category[]; alignRight: boolean }) {
  const rows = categories.filter((c) => month.byCategory[c] > 0).reverse();
  return (
    <div
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-10 mb-2 w-52 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg ${
        alignRight ? 'right-1/2 translate-x-6' : 'left-1/2 -translate-x-6'
      }`}
    >
      <p className="font-semibold text-slate-900">{formatMonthKey(month.key, 'long')}</p>
      <p className="mt-0.5 tabular-nums text-slate-500">
        {formatCurrency(month.total)} · {month.count} {month.count === 1 ? 'expense' : 'expenses'}
      </p>
      {rows.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          {rows.map((c) => (
            <li key={c} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} />
                {c}
              </span>
              <span className="tabular-nums text-slate-900">{formatCurrency(month.byCategory[c])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
