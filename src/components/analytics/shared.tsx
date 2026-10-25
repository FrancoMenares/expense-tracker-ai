import { CATEGORY_META } from '@/lib/categories';
import type { Category } from '@/lib/types';

/** Category key for multi-series charts: a colored dot beside ink-colored text, never colored text. */
export function Legend({ categories, className = '' }: { categories: Category[]; className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 ${className}`} aria-label="Legend">
      {categories.map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_META[c].color }} aria-hidden="true" />
          {c}
        </li>
      ))}
    </ul>
  );
}

export function ChartTableToggle({ view, onChange }: { view: 'chart' | 'table'; onChange: (view: 'chart' | 'table') => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium" role="group" aria-label="Display as">
      {(['chart', 'table'] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-md px-2.5 py-1 capitalize transition ${
            view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/**
 * Change in spending vs a previous period. More spending is the unfavorable direction, so it reads red;
 * the arrow and the word carry the meaning for anyone who can't rely on the color.
 */
export function SpendingDelta({ change, className = '' }: { change: number | null; className?: string }) {
  if (change === null) return <span className={`text-slate-400 ${className}`}>No prior data</span>;
  const rounded = Math.round(change);
  if (rounded === 0) return <span className={`text-slate-500 ${className}`}>No change</span>;
  const up = rounded > 0;
  return (
    <span className={`whitespace-nowrap font-medium ${up ? 'text-red-600' : 'text-emerald-700'} ${className}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span> {Math.abs(rounded)}%
      <span className="sr-only">{up ? ' more' : ' less'}</span>
    </span>
  );
}
