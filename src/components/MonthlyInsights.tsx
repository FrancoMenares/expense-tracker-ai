import { useMemo } from 'react';
import { getBudgetStreak, getCategoryTotals, type CategoryTotal } from '@/lib/analytics';
import { CATEGORY_META } from '@/lib/categories';
import { formatCompactCurrency, formatCurrency, formatMonthKey, monthKey, parseISODate, toISODate } from '@/lib/format';
import type { Expense } from '@/lib/types';
import { Card } from './ui';

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.5;

interface MonthlyInsightsProps {
  expenses: Expense[];
  /** Spending at or below this amount keeps the budget streak alive for the day. */
  dailyBudget?: number;
  now?: Date;
}

export default function MonthlyInsights({ expenses, dailyBudget = 50, now = new Date() }: MonthlyInsightsProps) {
  const today = toISODate(now);
  const currentKey = monthKey(today);
  const byCategory = useMemo(
    () => getCategoryTotals(expenses.filter((e) => monthKey(e.date) === currentKey)),
    [expenses, currentKey],
  );
  const total = byCategory.reduce((sum, c) => sum + c.amount, 0);
  const streak = useMemo(() => getBudgetStreak(expenses, dailyBudget, parseISODate(today)), [expenses, dailyBudget, today]);

  return (
    <Card className="mx-auto max-w-lg p-6 sm:p-8">
      <header className="border-b border-dashed border-slate-300 pb-4 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Monthly Insights</h2>
        <p className="mt-1 text-sm text-slate-500">{formatMonthKey(currentKey, 'long')}</p>
      </header>

      {byCategory.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No spending recorded this month yet</p>
      ) : (
        <>
          <SpendingDonut data={byCategory} total={total} />
          <TopCategories data={byCategory.slice(0, 3)} />
        </>
      )}

      <StreakPanel days={streak.days} dailyBudget={streak.dailyBudget} nextMilestone={streak.nextMilestone} />
    </Card>
  );
}

function SpendingDonut({ data, total }: { data: CategoryTotal[]; total: number }) {
  let offset = 0;
  const segments = data.map((d) => {
    const length = (d.percent / 100) * CIRCUMFERENCE;
    const segment = { ...d, length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className="relative mx-auto mt-6 h-48 w-48">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Spending by category this month">
        {segments.map((s) => (
          <circle
            key={s.category}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke={CATEGORY_META[s.category].color}
            strokeWidth="16"
            strokeDasharray={`${Math.max(s.length - (segments.length > 1 ? GAP : 0), 0.5)} ${CIRCUMFERENCE}`}
            strokeDashoffset={-s.offset}
          >
            <title>{`${s.category}: ${formatCurrency(s.amount)} (${s.percent.toFixed(1)}%)`}</title>
          </circle>
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-medium text-slate-500">Spending</span>
        <span className="text-lg font-semibold text-slate-900 tabular-nums">{formatCompactCurrency(total)}</span>
      </div>
    </div>
  );
}

function TopCategories({ data }: { data: CategoryTotal[] }) {
  return (
    <div className="mt-8">
      <h3 className="text-right text-xs font-medium uppercase tracking-wide text-slate-400">Top {data.length}</h3>
      <ul className="mt-2 space-y-3">
        {data.map((d) => (
          <li
            key={d.category}
            className="flex items-center justify-between gap-3 border-l-4 py-1.5 pl-4"
            style={{ borderColor: CATEGORY_META[d.category].color }}
          >
            <span className="flex items-center gap-2 text-base text-slate-800">
              <span aria-hidden="true">{CATEGORY_META[d.category].icon}</span>
              {d.category}
            </span>
            <span className="text-base font-semibold text-slate-900 tabular-nums">{formatCurrency(d.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StreakPanel({ days, dailyBudget, nextMilestone }: { days: number; dailyBudget: number; nextMilestone: number }) {
  const progress = Math.min((days / nextMilestone) * 100, 100);

  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 p-5">
      <h3 className="text-center text-lg font-medium text-slate-800">Budget Streak</h3>
      <div className="mt-2 flex items-center justify-center gap-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-emerald-600 tabular-nums">{days}</p>
          <p className="text-base text-slate-700">{days === 1 ? 'day' : 'days'}{days > 0 && '!'}</p>
        </div>
        <div className="w-28">
          <div
            className="h-4 overflow-hidden rounded-full border border-slate-300 bg-slate-100"
            role="progressbar"
            aria-label={`Progress to ${nextMilestone}-day milestone`}
            aria-valuemin={0}
            aria-valuemax={nextMilestone}
            aria-valuenow={days}
          >
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-center text-xs text-slate-500">
            {nextMilestone - days} to {nextMilestone}
          </p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Consecutive days at or under {formatCurrency(dailyBudget)} in spending
      </p>
    </div>
  );
}
