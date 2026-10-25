'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/Modal';
import { useCloud, type ScheduleInput } from '@/context/CloudContext';
import { useToast } from '@/context/ToastContext';
import { DESTINATIONS, DESTINATION_IDS, isOAuth, isValidEmail, parseRecipients, type DestinationId, type OAuthProviderId } from '@/lib/cloud/destinations';
import type { FileFormat } from '@/lib/cloud/files';
import { WEEKDAYS, describeCadence, nextRun, type Frequency } from '@/lib/cloud/schedule';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';
import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from '@/lib/cloud/templates';
import { ClockIcon } from '../icons';
import ConnectDialog from './ConnectDialog';
import ProviderGlyph from './ProviderGlyph';

const SCHEDULABLE = DESTINATION_IDS.filter((id) => DESTINATIONS[id].schedulable);

interface ScheduleDialogProps {
  /** null = closed. Pass an object (possibly empty) to open, optionally prefilled or with an id to edit. */
  initial: Partial<ScheduleInput> | null;
  onClose: () => void;
}

export default function ScheduleDialog({ initial, onClose }: ScheduleDialogProps) {
  return initial ? <ScheduleForm initial={initial} onClose={onClose} /> : null;
}

function ScheduleForm({ initial, onClose }: { initial: Partial<ScheduleInput>; onClose: () => void }) {
  const { state, saveSchedule } = useCloud();
  const { showToast } = useToast();
  const [connecting, setConnecting] = useState<OAuthProviderId | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId>(initial.templateId ?? 'full-backup');
  const [destination, setDestination] = useState<DestinationId>(initial.destination && DESTINATIONS[initial.destination].schedulable ? initial.destination : 'dropbox');
  // Only seed a target when one was given, so destinations fall back to their default (e.g. /Apps/Spendwise).
  const [targets, setTargets] = useState<Partial<Record<DestinationId, string>>>(
    initial.destination && initial.target ? { [initial.destination]: initial.target } : {},
  );
  const [name, setName] = useState(initial.name ?? '');
  const [periodIndex, setPeriodIndex] = useState(initial.periodIndex ?? TEMPLATES[templateId].defaultScheduleIndex);
  const [format, setFormat] = useState<FileFormat>(initial.format ?? TEMPLATES[templateId].defaultFormat);
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency ?? 'weekly');
  const [weekday, setWeekday] = useState(initial.weekday ?? 1);
  const [monthDay, setMonthDay] = useState(initial.monthDay ?? 1);
  const [time, setTime] = useState(initial.time ?? '09:00');

  const template = TEMPLATES[templateId];
  const spec = DESTINATIONS[destination];
  const target = targets[destination] ?? spec.defaultTarget ?? '';
  const connected = isOAuth(destination) ? Boolean(state.connections[destination]) : true;
  const cadence = { frequency, weekday, monthDay, time };
  const upcoming = useMemo(() => {
    const first = nextRun(cadence, new Date());
    return [first, nextRun(cadence, first), nextRun(cadence, nextRun(cadence, first))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, weekday, monthDay, time]);

  const defaultName = `${template.name} → ${spec.name}`;
  const issue = !connected
    ? `Connect ${spec.name} first.`
    : destination === 'email' && (parseRecipients(target).length === 0 || !parseRecipients(target).every(isValidEmail))
      ? 'Enter valid recipient emails.'
      : !target.trim()
        ? `Enter a ${spec.targetLabel?.toLowerCase()}.`
        : null;

  const pickTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setPeriodIndex(TEMPLATES[id].defaultScheduleIndex);
    setFormat(TEMPLATES[id].defaultFormat);
  };

  const save = () => {
    if (issue) return;
    const schedule = saveSchedule({
      id: initial.id,
      name: name.trim() || defaultName,
      templateId,
      destination,
      target: destination === 'email' ? parseRecipients(target).join(', ') : target.trim(),
      format,
      periodIndex,
      frequency,
      weekday,
      monthDay,
      time,
      enabled: initial.enabled ?? true,
    });
    showToast(`${schedule.name} scheduled · next run ${formatRelative(schedule.nextRunAt)}`);
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title={initial.id ? 'Edit schedule' : 'New scheduled export'} description="Runs automatically in the background.">
        <div className="space-y-5">
          <label className="block">
            <span className="label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={defaultName} className="input" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Template</span>
              <select value={templateId} onChange={(e) => pickTemplate(e.target.value as TemplateId)} className="input">
                {TEMPLATE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {TEMPLATES[id].emoji} {TEMPLATES[id].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Covering</span>
              <select value={periodIndex} onChange={(e) => setPeriodIndex(Number(e.target.value))} className="input" disabled={template.scheduleLabels.length === 1}>
                {template.scheduleLabels.map((l, i) => (
                  <option key={l} value={i}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="label">Deliver to</span>
            <div className="grid grid-cols-2 gap-2">
              {SCHEDULABLE.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDestination(id)}
                  aria-pressed={destination === id}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-sm transition ${
                    destination === id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ProviderGlyph id={id} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{DESTINATIONS[id].name}</span>
                    {isOAuth(id) && (
                      <span className="block text-[11px] text-slate-500">{state.connections[id] ? 'Connected' : 'Not connected'}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              {connected ? (
                <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                  <label className="block">
                    <span className="label">{spec.targetLabel}</span>
                    <input
                      value={target}
                      onChange={(e) => setTargets((t) => ({ ...t, [destination]: e.target.value }))}
                      placeholder={destination === 'email' ? 'you@example.com, accountant@firm.com' : undefined}
                      className="input"
                    />
                  </label>
                  {destination !== 'google-sheets' && (
                    <select aria-label="File format" value={format} onChange={(e) => setFormat(e.target.value as FileFormat)} className="input w-24">
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  )}
                </div>
              ) : (
                <button onClick={() => setConnecting(destination as OAuthProviderId)} className="btn-secondary w-full">
                  Connect {spec.name}
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="label">Repeat</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {(['daily', 'weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  aria-pressed={frequency === f}
                  className={`rounded-lg py-1.5 text-sm font-medium capitalize transition ${frequency === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {frequency === 'weekly' && (
                <select aria-label="Day of week" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className="input">
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              {frequency === 'monthly' && (
                <select aria-label="Day of month" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className="input">
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Day {i + 1}
                    </option>
                  ))}
                </select>
              )}
              <input type="time" aria-label="Time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className={`input ${frequency === 'daily' ? 'col-span-2' : ''}`} />
            </div>
          </div>

          <div className="rounded-xl bg-indigo-50/70 p-3.5 text-sm">
            <p className="flex items-center gap-2 font-medium text-indigo-900">
              <ClockIcon className="h-4 w-4" />
              {describeCadence(cadence)}
            </p>
            <p className="mt-1 text-xs text-indigo-800/80">Next runs: {upcoming.map((d) => formatDateTime(d.toISOString())).join(' · ')}</p>
            <p className="mt-1 text-xs text-indigo-800/60">Runs while Spendwise is open in a tab. Missed runs catch up the next time you open it.</p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {issue && <p className="mr-auto text-xs text-amber-700">{issue}</p>}
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={save} disabled={Boolean(issue)} className="btn-primary">
              {initial.id ? 'Save changes' : 'Create schedule'}
            </button>
          </div>
        </div>
      </Modal>
      <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} />
    </>
  );
}
