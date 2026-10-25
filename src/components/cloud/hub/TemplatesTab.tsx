'use client';

import { useMemo } from 'react';
import { useCloud, type ScheduleInput } from '@/context/CloudContext';
import { useExpenses } from '@/context/ExpensesContext';
import { DESTINATIONS } from '@/lib/cloud/destinations';
import { formatRelative } from '@/lib/cloud/time';
import { TEMPLATES, TEMPLATE_IDS, type TemplateId } from '@/lib/cloud/templates';
import { BoltIcon, ClockIcon, LinkIcon, SparkleIcon } from '../../icons';
import type { ComposerPreset } from '../ExportComposer';
import ProviderGlyph from '../ProviderGlyph';
import { Panel } from './shared';

interface Recipe {
  title: string;
  description: string;
  icon: 'clock' | 'bolt';
  schedule?: Partial<ScheduleInput>;
  connect?: 'google-sheets';
}

const RECIPES: Recipe[] = [
  {
    title: 'Sunday night backup',
    description: 'Full JSON backup to Dropbox every Sunday at 11 PM.',
    icon: 'clock',
    schedule: { name: 'Weekly backup', templateId: 'full-backup', destination: 'dropbox', format: 'json', frequency: 'weekly', weekday: 0, time: '23:00', periodIndex: 0 },
  },
  {
    title: 'Monthly recap by email',
    description: "Last month's summary in your inbox on the 1st.",
    icon: 'clock',
    schedule: { name: 'Monthly recap', templateId: 'monthly-summary', destination: 'email', format: 'csv', frequency: 'monthly', monthDay: 1, time: '08:00', periodIndex: 1 },
  },
  {
    title: 'Live spreadsheet',
    description: 'Keep a Google Sheet updated whenever you add an expense.',
    icon: 'bolt',
    connect: 'google-sheets',
  },
];

interface TemplatesTabProps {
  onCompose: (preset: ComposerPreset) => void;
  onSchedule: (prefill: Partial<ScheduleInput>) => void;
  onOpenConnections: () => void;
}

export default function TemplatesTab({ onCompose, onSchedule, onOpenConnections }: TemplatesTabProps) {
  const { expenses } = useExpenses();
  const { state } = useCloud();
  const now = useMemo(() => new Date(), []);

  const lastRun = (id: TemplateId) => state.history.find((h) => h.templateId === id && h.status === 'succeeded');

  return (
    <div className="space-y-10">
      <Panel title="Templates" description="Purpose-built exports. Pick one, then choose where it goes.">
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATE_IDS.map((id) => {
            const t = TEMPLATES[id];
            const period = t.periods(expenses, now)[0];
            const out = t.build(expenses, period, now);
            const last = lastRun(id);
            return (
              <article key={id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl transition group-hover:opacity-20 ${t.gradient}`} />
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-sm ${t.gradient}`}>{t.emoji}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900">{t.name}</h3>
                    <p className="text-sm text-slate-500">{t.tagline}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">{t.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span>
                    <span className="font-medium text-slate-700">{out.recordCount}</span> records · {period.label}
                  </span>
                  {last && (
                    <span className="inline-flex items-center gap-1">
                      <ProviderGlyph id={last.destination} size="sm" />
                      Last sent {formatRelative(last.finishedAt)}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => onCompose({ templateId: id })} className="btn-primary px-3 py-1.5">
                    Export
                  </button>
                  <button onClick={() => onCompose({ templateId: id, destination: 'link' })} className="btn-secondary px-3 py-1.5">
                    <LinkIcon className="h-4 w-4" /> Share
                  </button>
                  <button
                    onClick={() => onSchedule({ templateId: id, format: t.defaultFormat, periodIndex: t.defaultScheduleIndex })}
                    className="btn-secondary px-3 py-1.5"
                  >
                    <ClockIcon className="h-4 w-4" /> Schedule
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="Automation recipes" description="One-click setups that people commonly use.">
        <div className="grid gap-3 md:grid-cols-3">
          {RECIPES.map((r) => (
            <button
              key={r.title}
              onClick={() => (r.schedule ? onSchedule(r.schedule) : onOpenConnections())}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-left transition hover:border-indigo-300 hover:shadow-sm"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                {r.icon === 'clock' ? <ClockIcon className="h-5 w-5" /> : <BoltIcon className="h-5 w-5" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{r.title}</span>
                <span className="block text-xs text-slate-500">{r.description}</span>
                {r.schedule?.destination && (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <ProviderGlyph id={r.schedule.destination} size="sm" /> {DESTINATIONS[r.schedule.destination].name}
                  </span>
                )}
                {r.connect && (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <ProviderGlyph id={r.connect} size="sm" /> {DESTINATIONS[r.connect].name}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <SparkleIcon className="h-3.5 w-3.5" /> Recipes prefill a schedule. You review everything before it&apos;s saved.
        </p>
      </Panel>
    </div>
  );
}
