import { formatCell, type Cell, type Column, type Highlight } from '@/lib/cloud/templates';

interface ReportViewProps {
  columns: Column[];
  rows: Cell[][];
  highlights: Highlight[];
  /** Show at most this many rows, with a note about the rest. */
  limit?: number;
  compact?: boolean;
}

const ALIGN_RIGHT = new Set(['currency', 'percent', 'number']);

export default function ReportView({ columns, rows, highlights, limit, compact }: ReportViewProps) {
  const visible = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {highlights.map((h) => (
          <div key={h.label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{h.label}</p>
            <p className="mt-1 truncate text-base font-semibold tabular-nums text-slate-900" title={h.value}>
              {h.value}
            </p>
            {h.hint && (
              <p className="truncate text-xs text-slate-500" title={h.hint}>
                {h.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">No data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`whitespace-nowrap px-3.5 py-2 font-medium ${ALIGN_RIGHT.has(c.kind) ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-3.5 py-2 ${
                          ALIGN_RIGHT.has(columns[i].kind) ? 'whitespace-nowrap text-right tabular-nums text-slate-900' : 'max-w-[220px] truncate text-slate-600'
                        }`}
                        title={typeof cell === 'string' ? cell : undefined}
                      >
                        {formatCell(cell, columns[i].kind)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {limit && rows.length > limit && (
          <p className="border-t border-slate-100 bg-slate-50 px-3.5 py-2 text-xs text-slate-500">
            + {rows.length - limit} more {rows.length - limit === 1 ? 'row' : 'rows'}
          </p>
        )}
      </div>
    </div>
  );
}
