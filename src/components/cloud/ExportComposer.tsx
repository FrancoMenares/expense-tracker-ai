'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useCloud, type ScheduleInput } from '@/context/CloudContext';
import { useExpenses } from '@/context/ExpensesContext';
import {
  DESTINATIONS,
  DESTINATION_IDS,
  isOAuth,
  isValidEmail,
  type DestinationId,
  type OAuthProviderId,
} from '@/lib/cloud/destinations';
import { buildFile, byteSize, formatBytes, type FileFormat } from '@/lib/cloud/files';
import { TEMPLATES, TEMPLATE_IDS, formatCell, resolvePeriod, type TemplateId, type TemplateOutput } from '@/lib/cloud/templates';
import { generateId } from '@/lib/storage';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, FolderIcon, LockIcon, MailIcon, XIcon } from '../icons';
import ConnectDialog from './ConnectDialog';
import Drawer from './Drawer';
import ProviderGlyph from './ProviderGlyph';
import ReportView from './ReportView';
import ShareResult from './ShareResult';

export interface ComposerPreset {
  templateId?: TemplateId;
  periodId?: string;
  destination?: DestinationId;
}

interface ExportComposerProps {
  open: boolean;
  preset: ComposerPreset;
  onClose: () => void;
  onSchedule: (prefill: Partial<ScheduleInput>) => void;
}

const STEPS = ['Template', 'Destination', 'Review'] as const;
const EXPIRY_OPTIONS: { label: string; days: number | null }[] = [
  { label: '24 hours', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Never', days: null },
];

export default function ExportComposer({ open, ...props }: ExportComposerProps) {
  // Remount per opening so each export starts clean.
  return open ? <Composer {...props} /> : null;
}

function Composer({ preset, onClose, onSchedule }: Omit<ExportComposerProps, 'open'>) {
  const { expenses } = useExpenses();
  const { state, jobs, runExport } = useCloud();
  const now = useMemo(() => new Date(), []);

  // Jump ahead when the preset fully determines the export; destinations that need input start at step 2.
  const [step, setStep] = useState(
    !preset.templateId ? 0 : preset.destination === 'link' || preset.destination === 'download' ? 2 : 1,
  );
  const [templateId, setTemplateId] = useState<TemplateId>(preset.templateId ?? 'monthly-summary');
  const [periodId, setPeriodId] = useState<string | undefined>(preset.periodId);
  const [destination, setDestination] = useState<DestinationId>(preset.destination ?? 'download');
  const [format, setFormat] = useState<FileFormat>(TEMPLATES[preset.templateId ?? 'monthly-summary'].defaultFormat);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientDraft, setRecipientDraft] = useState('');
  const [message, setMessage] = useState('');
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [passcode, setPasscode] = useState('');
  const [connecting, setConnecting] = useState<OAuthProviderId | null>(null);
  const [linkJobId, setLinkJobId] = useState<string | null>(null);

  const template = TEMPLATES[templateId];
  const periods = useMemo(() => template.periods(expenses, now), [template, expenses, now]);
  const period = resolvePeriod(templateId, periodId, expenses, now);
  const output = useMemo(() => template.build(expenses, period, now), [template, expenses, period, now]);
  const file = useMemo(() => buildFile(output, format, now), [output, format, now]);
  const spec = DESTINATIONS[destination];
  const connection = isOAuth(destination) ? state.connections[destination] : undefined;
  const target = destination === 'email' ? recipients.join(', ') : (targets[destination] ?? spec.defaultTarget ?? '');

  const linkJob = linkJobId ? jobs.find((j) => j.id === linkJobId) : undefined;
  const share = linkJob?.result?.shareUrl ? state.shares.find((s) => s.url === linkJob.result?.shareUrl) : undefined;

  const pickTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setPeriodId(undefined);
    setFormat(TEMPLATES[id].defaultFormat);
  };

  const addRecipient = (raw = recipientDraft) => {
    const parts = raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setRecipients((list) => [...new Set([...list, ...parts])]);
    setRecipientDraft('');
  };

  const destinationIssue = (() => {
    if (spec.kind === 'soon') return `${spec.name} is coming soon.`;
    if (isOAuth(destination) && !connection) return `Connect ${spec.name} to continue.`;
    if (destination === 'email') {
      if (recipients.length === 0) return 'Add at least one recipient.';
      if (recipients.some((r) => !isValidEmail(r))) return 'Fix the highlighted email addresses.';
    }
    if (isOAuth(destination) && !target.trim()) return `Enter a ${spec.targetLabel?.toLowerCase()}.`;
    if (destination === 'link' && passcode && passcode.length < 4) return 'Passcodes need at least 4 characters.';
    return null;
  })();

  const run = async () => {
    const jobId = generateId();
    const request = {
      jobId,
      templateId,
      periodId: period.id,
      destination,
      target,
      format,
      message: message || undefined,
      trigger: 'manual' as const,
      share: destination === 'link' ? { expiresInDays, passcode: passcode || undefined } : undefined,
    };
    if (destination === 'link') {
      setLinkJobId(jobId);
      await runExport(request);
    } else {
      void runExport(request);
      onClose();
    }
  };

  const actionLabel: Record<DestinationId, string> = {
    download: `Download ${format.toUpperCase()}`,
    link: 'Create link',
    email: 'Send email',
    'google-sheets': 'Write to Sheets',
    dropbox: 'Upload to Dropbox',
    onedrive: 'Upload to OneDrive',
    notion: 'Coming soon',
    slack: 'Coming soon',
  };

  // Link flow takes over the drawer once started.
  if (linkJobId) {
    return (
      <Drawer open onClose={onClose} title={share ? 'Your link is ready' : 'Creating snapshot link'} subtitle={output.title}>
        {share ? (
          <ShareResult share={share} />
        ) : linkJob?.status === 'failed' ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{linkJob.error}</p>
        ) : (
          <StageList stages={linkJob?.stages ?? []} current={linkJob?.stageIndex ?? 0} />
        )}
      </Drawer>
    );
  }

  const footer = (
    <div className="flex items-center justify-between gap-3">
      {step > 0 ? (
        <button onClick={() => setStep(step - 1)} className="btn-secondary">
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>
      ) : (
        <span className="text-sm text-slate-500">
          <span className="font-medium text-slate-900">{output.recordCount}</span> records · {period.label}
        </span>
      )}
      {step < 2 ? (
        <button onClick={() => setStep(step + 1)} disabled={step === 1 && Boolean(destinationIssue)} className="btn-primary">
          Continue
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      ) : (
        <button onClick={run} disabled={Boolean(destinationIssue)} className="btn-primary">
          {actionLabel[destination]}
        </button>
      )}
    </div>
  );

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        title="New export"
        subtitle={<StepIndicator step={step} onStep={(i) => i < step && setStep(i)} />}
        footer={footer}
      >
        {step === 0 && (
          <div className="space-y-5">
            <div role="radiogroup" aria-label="Template" className="grid gap-2.5">
              {TEMPLATE_IDS.map((id) => {
                const t = TEMPLATES[id];
                const checked = id === templateId;
                return (
                  <label
                    key={id}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border p-3.5 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-500/20 ${
                      checked ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="template" className="sr-only" checked={checked} onChange={() => pickTemplate(id)} />
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-sm ${t.gradient}`}>
                      {t.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{t.name}</span>
                      <span className="block text-xs text-slate-500">{t.description}</span>
                    </span>
                    {checked && <CheckIcon className="h-5 w-5 flex-shrink-0 text-indigo-600" />}
                  </label>
                );
              })}
            </div>

            {periods.length > 1 && (
              <div>
                <span className="label">Period</span>
                <div className="flex flex-wrap gap-1.5">
                  {periods.slice(0, 6).map((p) => (
                    <Pill key={p.id} active={p.id === period.id} onClick={() => setPeriodId(p.id)}>
                      {p.label}
                    </Pill>
                  ))}
                  {periods.length > 6 && (
                    <select
                      aria-label="More periods"
                      value={periods.slice(6).some((p) => p.id === period.id) ? period.id : ''}
                      onChange={(e) => e.target.value && setPeriodId(e.target.value)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600"
                    >
                      <option value="">More…</option>
                      {periods.slice(6).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}

            <div>
              <span className="label">Preview</span>
              <ReportView columns={output.columns} rows={output.rows} highlights={output.highlights} limit={5} compact />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2.5">
              {DESTINATION_IDS.map((id) => {
                const d = DESTINATIONS[id];
                const connected = isOAuth(id) ? Boolean(state.connections[id]) : null;
                const soon = d.kind === 'soon';
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={soon}
                    onClick={() => setDestination(id)}
                    aria-pressed={destination === id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      destination === id ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <ProviderGlyph id={id} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{d.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {soon ? 'Coming soon' : connected === null ? d.blurb : connected ? 'Connected' : 'Not connected'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              {destination === 'download' && <FormatPicker format={format} onChange={setFormat} />}

              {destination === 'link' && (
                <div className="space-y-4">
                  <div>
                    <span className="label">Link expires after</span>
                    <div className="flex flex-wrap gap-1.5">
                      {EXPIRY_OPTIONS.map((o) => (
                        <Pill key={o.label} active={expiresInDays === o.days} onClick={() => setExpiresInDays(o.days)}>
                          {o.label}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <label className="block">
                    <span className="label flex items-center gap-1.5">
                      <LockIcon className="h-3.5 w-3.5" /> Passcode <span className="font-normal text-slate-400">(optional)</span>
                    </span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Encrypts the report end-to-end"
                      className="input"
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      AES-256 encrypted in your browser. The passcode is never stored, so keep it safe.
                    </span>
                  </label>
                </div>
              )}

              {destination === 'email' && (
                <div className="space-y-4">
                  <div>
                    <span className="label">Recipients</span>
                    <div className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15">
                      {recipients.map((r) => (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isValidEmail(r) ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                          }`}
                        >
                          {r}
                          <button type="button" onClick={() => setRecipients((l) => l.filter((x) => x !== r))} aria-label={`Remove ${r}`}>
                            <XIcon className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={recipientDraft}
                        onChange={(e) => (/[,;\s]$/.test(e.target.value) ? addRecipient(e.target.value) : setRecipientDraft(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addRecipient();
                          } else if (e.key === 'Backspace' && !recipientDraft) setRecipients((l) => l.slice(0, -1));
                        }}
                        onBlur={() => addRecipient()}
                        placeholder={recipients.length ? '' : 'name@company.com, accountant@firm.com'}
                        aria-label="Add recipient"
                        className="min-w-[140px] flex-1 border-0 bg-transparent px-1 text-sm outline-none"
                      />
                    </div>
                  </div>
                  <label className="block">
                    <span className="label">Message <span className="font-normal text-slate-400">(optional)</span></span>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className="input resize-none" placeholder="Here's this month's spending recap." />
                  </label>
                  <FormatPicker format={format} onChange={setFormat} />
                </div>
              )}

              {isOAuth(destination) &&
                (connection ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Connected as <span className="font-medium text-slate-900">{connection.account}</span>
                      </span>
                    </div>
                    <label className="block">
                      <span className="label">{spec.targetLabel}</span>
                      <input
                        value={target}
                        onChange={(e) => setTargets((t) => ({ ...t, [destination]: e.target.value }))}
                        className="input"
                      />
                    </label>
                    {destination !== 'google-sheets' && <FormatPicker format={format} onChange={setFormat} />}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-3 text-center">
                    <ProviderGlyph id={destination} size="lg" />
                    <p className="text-sm text-slate-600">
                      Connect your {spec.name} account to send exports there{spec.supportsLiveSync ? ' and keep them in sync automatically' : ''}.
                    </p>
                    <button onClick={() => setConnecting(destination)} className="btn-primary">
                      Connect {spec.name}
                    </button>
                  </div>
                ))}
            </div>
            {destinationIssue && !(isOAuth(destination) && !connection) && (
              <p className="text-sm text-amber-700" role="status">
                {destinationIssue}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 text-sm">
              <ReviewRow label="Template">
                {template.emoji} {template.name}
              </ReviewRow>
              <ReviewRow label="Period">{period.label}</ReviewRow>
              <ReviewRow label="Destination">
                <span className="inline-flex items-center gap-2">
                  <ProviderGlyph id={destination} size="sm" /> {spec.name}
                </span>
              </ReviewRow>
              {target && <ReviewRow label={spec.targetLabel ?? 'Target'}>{target}</ReviewRow>}
              {destination === 'link' ? (
                <ReviewRow label="Access">
                  {EXPIRY_OPTIONS.find((o) => o.days === expiresInDays)?.label} · {passcode ? 'Passcode protected' : 'Anyone with the link'}
                </ReviewRow>
              ) : (
                destination !== 'google-sheets' && (
                  <ReviewRow label="File">
                    <span className="font-mono text-xs">{file.name}</span> <span className="text-slate-400">· {formatBytes(byteSize(file.content))}</span>
                  </ReviewRow>
                )
              )}
            </dl>

            {destination === 'email' && <EmailPreview output={output} recipients={recipients} message={message} fileName={file.name} />}
            {destination === 'google-sheets' && <SheetPreview output={output} sheetName={target} />}
            {(destination === 'dropbox' || destination === 'onedrive') && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-mono text-xs text-slate-600">
                <FolderIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span className="truncate">
                  {spec.name}
                  {target.replace(/\/?$/, '/')}
                  <span className="font-semibold text-slate-900">{file.name}</span>
                </span>
              </div>
            )}
            {(destination === 'download' || destination === 'link') && (
              <ReportView columns={output.columns} rows={output.rows} highlights={output.highlights} limit={6} compact />
            )}

            {spec.schedulable && (
              <button
                onClick={() => {
                  onSchedule({
                    name: `${template.name} → ${spec.name}`,
                    templateId,
                    destination,
                    target,
                    format,
                    periodIndex: template.defaultScheduleIndex,
                  });
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3.5 text-left text-sm transition hover:bg-indigo-50"
              >
                <ClockIcon className="h-5 w-5 flex-shrink-0 text-indigo-600" />
                <span>
                  <span className="block font-medium text-indigo-900">Make this automatic</span>
                  <span className="block text-xs text-indigo-700/80">Schedule this export to run daily, weekly or monthly.</span>
                </span>
                <ChevronRightIcon className="ml-auto h-4 w-4 text-indigo-400" />
              </button>
            )}
          </div>
        )}
      </Drawer>
      <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} />
    </>
  );
}

function StepIndicator({ step, onStep }: { step: number; onStep: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStep(i)}
            disabled={i >= step}
            className={`flex items-center gap-1.5 font-medium ${i === step ? 'text-indigo-700' : i < step ? 'text-slate-700 hover:text-indigo-700' : 'text-slate-400'}`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {i < step ? <CheckIcon className="h-3 w-3" /> : i + 1}
            </span>
            {label}
          </button>
          {i < STEPS.length - 1 && <span className="h-px w-5 bg-slate-200" />}
        </li>
      ))}
    </ol>
  );
}

export function StageList({ stages, current }: { stages: string[]; current: number }) {
  return (
    <ol className="space-y-3 py-2">
      {stages.map((s, i) => (
        <li key={s} className="flex items-center gap-3 text-sm">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              i < current ? 'bg-emerald-100 text-emerald-600' : i === current ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-300'
            }`}
          >
            {i < current ? <CheckIcon className="h-3.5 w-3.5" /> : <span className={`h-1.5 w-1.5 rounded-full bg-current ${i === current ? 'animate-pulse' : ''}`} />}
          </span>
          <span className={i <= current ? 'text-slate-900' : 'text-slate-400'}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
        active ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function FormatPicker({ format, onChange }: { format: FileFormat; onChange: (f: FileFormat) => void }) {
  return (
    <div>
      <span className="label">File format</span>
      <div className="flex gap-1.5">
        {(['csv', 'json'] as const).map((f) => (
          <Pill key={f} active={format === f} onClick={() => onChange(f)}>
            {f.toUpperCase()}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

function EmailPreview({ output, recipients, message, fileName }: { output: TemplateOutput; recipients: string[]; message: string; fileName: string }) {
  const body = [message, '', ...output.highlights.map((h) => `${h.label}: ${h.value}`), '', '— Sent from Spendwise'].join('\n').trim();
  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(output.title)}&body=${encodeURIComponent(body)}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="space-y-1 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p>
          <span className="inline-block w-14">From</span>
          <span className="text-slate-800">Spendwise Reports</span>
        </p>
        <p className="truncate">
          <span className="inline-block w-14">To</span>
          <span className="text-slate-800">{recipients.join(', ')}</span>
        </p>
        <p>
          <span className="inline-block w-14">Subject</span>
          <span className="font-medium text-slate-800">{output.title}</span>
        </p>
      </div>
      <div className="space-y-3 bg-white px-4 py-4 text-sm text-slate-700">
        {message && <p className="whitespace-pre-line">{message}</p>}
        <div className="grid grid-cols-2 gap-2">
          {output.highlights.map((h) => (
            <div key={h.label} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-[11px] text-slate-500">{h.label}</p>
              <p className="truncate font-semibold text-slate-900">{h.value}</p>
            </div>
          ))}
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
          <span className="rounded bg-emerald-100 px-1 font-mono text-[10px] font-bold text-emerald-700">{fileName.split('.').pop()?.toUpperCase()}</span>
          {fileName}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        <span>Prefer your own mail app? The summary is included; attach the file yourself.</span>
        <a href={mailto} className="inline-flex flex-shrink-0 items-center gap-1 font-medium text-indigo-600 hover:text-indigo-700">
          <MailIcon className="h-3.5 w-3.5" /> Open in mail app
        </a>
      </div>
    </div>
  );
}

function SheetPreview({ output, sheetName }: { output: TemplateOutput; sheetName: string }) {
  const rows = output.rows.slice(0, 6);
  const letters = output.columns.map((_, i) => String.fromCharCode(65 + i));
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <ProviderGlyph id="google-sheets" size="sm" />
        <span className="truncate text-sm font-medium text-slate-800">{sheetName}</span>
        <span className="ml-auto text-[11px] text-slate-400">+{output.rows.length} rows</span>
      </div>
      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr className="bg-slate-100 text-slate-500">
              <th className="w-8 border border-slate-200" />
              {letters.map((l) => (
                <th key={l} className="border border-slate-200 px-2 py-0.5 font-normal">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">1</td>
              {output.columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap border border-slate-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-900">
                  {c.label}
                </td>
              ))}
            </tr>
            {rows.map((row, r) => (
              <tr key={r}>
                <td className="border border-slate-200 bg-slate-100 text-center text-slate-500">{r + 2}</td>
                {row.map((cell, i) => (
                  <td key={i} className="max-w-[140px] truncate whitespace-nowrap border border-slate-200 px-2 py-1 text-slate-700">
                    {formatCell(cell, output.columns[i].kind)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-px border-t border-slate-200 bg-slate-100 px-2 pt-1 text-[11px]">
        <span className="rounded-t bg-white px-3 py-1 font-medium text-emerald-700 shadow-sm">{TEMPLATES[output.templateId].name}</span>
        <span className="px-3 py-1 text-slate-400">History</span>
      </div>
    </div>
  );
}
