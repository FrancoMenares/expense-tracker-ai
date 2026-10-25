'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useCloud, type ScheduleInput } from '@/context/CloudContext';
import { DESTINATIONS, isOAuth } from '@/lib/cloud/destinations';
import { describeCadence } from '@/lib/cloud/schedule';
import type { Schedule } from '@/lib/cloud/store';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';
import { TEMPLATES } from '@/lib/cloud/templates';
import { AlertIcon, ClockIcon, PencilIcon, PlayIcon, PlusIcon, TrashIcon } from '../../icons';
import ProviderGlyph from '../ProviderGlyph';
import { EmptyPanel, Panel, Toggle } from './shared';

export default function SchedulesTab({ onEdit }: { onEdit: (initial: Partial<ScheduleInput>) => void }) {
  const { state, toggleSchedule, deleteSchedule, runScheduleNow } = useCloud();
  const [confirm, setConfirm] = useState<Schedule | null>(null);
  const schedules = [...state.schedules].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.nextRunAt.localeCompare(b.nextRunAt));

  return (
    <Panel
      title="Scheduled exports"
      description="Recurring exports that run in the background while Spendwise is open."
      action={
        <button onClick={() => onEdit({})} className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New schedule
        </button>
      }
    >
      {schedules.length === 0 ? (
        <EmptyPanel icon={<ClockIcon className="h-6 w-6" />} title="No schedules yet">
          Set up automatic backups or recurring reports, e.g. a full backup to Dropbox every Sunday.
        </EmptyPanel>
      ) : (
        <ul className="space-y-3">
          {schedules.map((s) => {
            const disconnected = isOAuth(s.destination) && !state.connections[s.destination];
            const lastRun = state.history.find((h) => h.scheduleId === s.id);
            return (
              <li
                key={s.id}
                className={`flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center ${s.enabled ? 'border-slate-200' : 'border-slate-200 opacity-70'}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${TEMPLATES[s.templateId].gradient}`}>
                    {TEMPLATES[s.templateId].emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{s.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span>{describeCadence(s)}</span>
                      <span className="inline-flex items-center gap-1">
                        → <ProviderGlyph id={s.destination} size="sm" />
                        <span className="max-w-[180px] truncate">{s.target || DESTINATIONS[s.destination].name}</span>
                      </span>
                    </p>
                    {disconnected && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                        <AlertIcon className="h-3.5 w-3.5" /> {DESTINATIONS[s.destination].name} is disconnected
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 sm:w-48 sm:flex-col sm:items-start sm:gap-0.5">
                  <span title={formatDateTime(s.nextRunAt)}>
                    {s.enabled ? (
                      <>
                        Next <span className="font-medium text-slate-700">{formatRelative(s.nextRunAt)}</span>
                      </>
                    ) : (
                      'Paused'
                    )}
                  </span>
                  <span>
                    {s.lastRunAt ? `Last ${formatRelative(s.lastRunAt)}` : 'Never run'}
                    {lastRun?.status === 'failed' && <span className="ml-1 text-red-600">· failed</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Toggle checked={s.enabled} onChange={() => toggleSchedule(s.id)} label={`${s.enabled ? 'Pause' : 'Resume'} ${s.name}`} />
                  <span className="mx-1 h-5 w-px bg-slate-200" />
                  <IconButton label="Run now" onClick={() => runScheduleNow(s.id)}>
                    <PlayIcon className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Edit" onClick={() => onEdit(s)}>
                    <PencilIcon className="h-4 w-4" />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => setConfirm(s)} danger>
                    <TrashIcon className="h-4 w-4" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={confirm !== null}
        title="Delete schedule?"
        message={`“${confirm?.name}” will stop running. Past exports stay in your history.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirm) deleteSchedule(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </Panel>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 ${danger ? 'hover:text-red-600' : 'hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}
