import type { Insight } from '@/lib/insights';
import { InfoIcon, TrendUpIcon } from '../icons';
import { Card } from '../ui';

const TONE = {
  up: { label: 'Spending up', className: 'bg-red-50 text-red-600', icon: <TrendUpIcon className="h-4 w-4" /> },
  down: { label: 'Spending down', className: 'bg-emerald-50 text-emerald-700', icon: <TrendUpIcon className="h-4 w-4 -scale-y-100" /> },
  neutral: { label: 'Observation', className: 'bg-indigo-50 text-indigo-600', icon: <InfoIcon className="h-4 w-4" /> },
} as const;

export default function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Insights</h2>
      <p className="text-sm text-slate-500">What stands out in this period</p>

      {insights.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Add a few more expenses to see insights.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {insights.map((insight) => {
            const tone = TONE[insight.tone];
            return (
              <li key={insight.id} className="flex gap-3">
                <span className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${tone.className}`} title={tone.label}>
                  {tone.icon}
                  <span className="sr-only">{tone.label}:</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                  <p className="text-sm text-slate-500">{insight.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
