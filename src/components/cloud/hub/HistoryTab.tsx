'use client';

import { useMemo, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useCloud } from '@/context/CloudContext';
import { DESTINATIONS } from '@/lib/cloud/destinations';
import { downloadFile, formatBytes } from '@/lib/cloud/files';
import type { HistoryEntry } from '@/lib/cloud/store';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';
import { TEMPLATES } from '@/lib/cloud/templates';
import { ClockIcon, CopyIcon, DownloadIcon, ListIcon, RefreshIcon } from '../../icons';
import type { ComposerPreset } from '../ExportComposer';
import ProviderGlyph from '../ProviderGlyph';
import { useCopy } from '../ShareResult';
import { EmptyPanel, Panel } from './shared';

type Filter = 'all' | 'manual' | 'schedule' | 'failed';

export default function HistoryTab({ onCompose }: { onCompose: (preset: ComposerPreset) => void }) {
  const { state, runExport, clearHistory } = useCloud();
  const { copy } = useCopy();
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  // Records added since the previous successful export of the same template and period.
  const deltas = useMemo(() => {
    const map = new Map<string, number>();
    state.history.forEach((h, i) => {
      if (h.status !== 'succeeded') return;
      const prev = state.history.slice(i + 1).find((p) => p.status === 'succeeded' && p.templateId === h.templateId && p.periodId === h.periodId);
      if (prev) map.set(h.id, h.recordCount - prev.recordCount);
    });
    return map;
  }, [state.history]);

  const rows = state.history.filter((h) => (filter === 'all' ? true : filter === 'failed' ? h.status === 'failed' : h.trigger === filter));

  const rerun = (h: HistoryEntry) => {
    if (h.destination === 'link' || h.destination === 'download') {
      onCompose({ templateId: h.templateId, periodId: h.periodId, destination: h.destination });
      return;
    }
    void runExport({ templateId: h.templateId, periodId: h.periodId, destination: h.destination, target: h.target, format: h.format, trigger: 'manual' });
  };

  return (
    <Panel
      title="Export history"
      description="Every export, where it went, and the exact file that was delivered."
      action={
        state.history.length > 0 && (
          <button onClick={() => setConfirmClear(true)} className="text-sm font-medium text-slate-500 hover:text-red-600">
            Clear history
          </button>
        )
      }
    >
      {state.history.length === 0 ? (
        <EmptyPanel icon={<ListIcon className="h-6 w-6" />} title="Nothing exported yet">
          Your exports will appear here with timestamps, destinations and a copy of each file.
        </EmptyPanel>
      ) : (
        <>
          <div className="flex gap-1.5">
            {(['all', 'manual', 'schedule', 'failed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                  filter === f ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {f === 'schedule' ? 'Scheduled' : f}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">When</th>
                    <th className="px-4 py-2.5 font-medium">Export</th>
                    <th className="px-4 py-2.5 font-medium">Destination</th>
                    <th className="px-4 py-2.5 text-right font-medium">Records</th>
                    <th className="px-4 py-2.5 text-right font-medium">Size</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((h) => {
                    const share = h.shareId ? state.shares.find((s) => s.id === h.shareId) : undefined;
                    const delta = deltas.get(h.id);
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600" title={formatDateTime(h.finishedAt)}>
                          {formatRelative(h.finishedAt)}
                          <span className="block text-[11px] text-slate-400">{formatDateTime(h.finishedAt)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <span aria-hidden="true">{TEMPLATES[h.templateId].emoji}</span>
                            <span className="min-w-0">
                              <span className="block whitespace-nowrap font-medium text-slate-900">{TEMPLATES[h.templateId].name}</span>
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                {h.periodLabel}
                                {h.trigger === 'schedule' && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 text-[10px] font-medium text-indigo-700">
                                    <ClockIcon className="h-3 w-3" /> Scheduled
                                  </span>
                                )}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <ProviderGlyph id={h.destination} size="sm" />
                            <span className="min-w-0">
                              <span className="block whitespace-nowrap text-slate-900">{DESTINATIONS[h.destination].name}</span>
                              {h.target && <span className="block max-w-[180px] truncate text-xs text-slate-500">{h.target}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-900">
                          {h.recordCount}
                          {delta !== undefined && delta !== 0 && (
                            <span className={`ml-1.5 rounded px-1 text-[11px] font-medium ${delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`} title="Change since the previous export of this report">
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-slate-500">{h.bytes ? formatBytes(h.bytes) : '—'}</td>
                        <td className="px-4 py-3">
                          {h.status === 'succeeded' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700" title={h.error}>
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <span className="inline-flex gap-0.5">
                            {h.file && (
                              <ActionButton label="Download this file" onClick={() => downloadFile(h.file!)}>
                                <DownloadIcon className="h-4 w-4" />
                              </ActionButton>
                            )}
                            {share && (
                              <ActionButton label="Copy link" onClick={() => copy(share.url)}>
                                <CopyIcon className="h-4 w-4" />
                              </ActionButton>
                            )}
                            <ActionButton label={h.status === 'failed' ? 'Retry' : 'Run again'} onClick={() => rerun(h)}>
                              <RefreshIcon className="h-4 w-4" />
                            </ActionButton>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-500">No exports match this filter.</p>}
          </div>
        </>
      )}
      <ConfirmDialog
        open={confirmClear}
        title="Clear export history?"
        message="Retained files will be removed from this device. Shared links keep working."
        confirmLabel="Clear history"
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </Panel>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
      {children}
    </button>
  );
}
