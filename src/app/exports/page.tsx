'use client';

import { useEffect, useState } from 'react';
import ConnectDialog from '@/components/cloud/ConnectDialog';
import ExportComposer, { type ComposerPreset } from '@/components/cloud/ExportComposer';
import ScheduleDialog from '@/components/cloud/ScheduleDialog';
import ConnectionsTab from '@/components/cloud/hub/ConnectionsTab';
import HistoryTab from '@/components/cloud/hub/HistoryTab';
import SchedulesTab from '@/components/cloud/hub/SchedulesTab';
import SharesTab from '@/components/cloud/hub/SharesTab';
import TemplatesTab from '@/components/cloud/hub/TemplatesTab';
import { StatusDot } from '@/components/cloud/hub/shared';
import { ClockIcon, InfoIcon, PlusIcon } from '@/components/icons';
import { useCloud, type ScheduleInput } from '@/context/CloudContext';
import type { OAuthProviderId } from '@/lib/cloud/destinations';
import { describeExpiry } from '@/components/cloud/ShareResult';

const TABS = [
  { id: 'templates', label: 'Templates' },
  { id: 'connections', label: 'Connections' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'links', label: 'Shared links' },
  { id: 'history', label: 'History' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function tabFromHash(): TabId {
  const hash = window.location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : 'templates';
}

export default function ExportsPage() {
  const { state, ready, online, syncStatus } = useCloud();
  const [tab, setTab] = useState<TabId>('templates');
  const [composer, setComposer] = useState<ComposerPreset | null>(null);
  const [schedule, setSchedule] = useState<Partial<ScheduleInput> | null>(null);
  const [connecting, setConnecting] = useState<OAuthProviderId | null>(null);

  useEffect(() => {
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    history.replaceState(null, '', `#${id}`);
  };

  const connections = Object.keys(state.connections).length;
  const activeSchedules = state.schedules.filter((s) => s.enabled).length;
  const liveLinks = state.shares.filter((s) => !describeExpiry(s.expiresAt).expired).length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const exportsThisMonth = state.history.filter((h) => h.status === 'succeeded' && h.finishedAt >= monthStart).length;

  const counts: Partial<Record<TabId, number>> = {
    connections,
    schedules: activeSchedules,
    links: liveLinks,
    history: state.history.length,
  };

  const syncLabel = !online ? 'Offline · exports queued' : syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Sync issue' : syncStatus === 'synced' ? 'All apps synced' : 'No apps connected';

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium ring-1 ring-inset ring-white/15">
                <StatusDot status={!online ? 'error' : syncStatus} />
                {ready ? syncLabel : 'Loading…'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 font-medium text-amber-200 ring-1 ring-inset ring-amber-300/30">
                <InfoIcon className="h-3.5 w-3.5" /> Demo: cloud services are simulated
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Export &amp; Share</h1>
            <p className="mt-2 text-slate-300">
              Send your spending anywhere: inboxes, spreadsheets, cloud drives, or a private link. Run it once, or put it on autopilot.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSchedule({})} className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/30">
              <ClockIcon className="h-4 w-4" /> Schedule
            </button>
            <button onClick={() => setComposer({})} className="btn bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-white/40">
              <PlusIcon className="h-4 w-4" /> New export
            </button>
          </div>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
          {[
            ['Exports this month', exportsThisMonth],
            ['Connected apps', connections],
            ['Active schedules', activeSchedules],
            ['Live links', liveLinks],
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-900/60 px-4 py-3">
              <dt className="text-xs text-slate-400">{label}</dt>
              <dd className="mt-0.5 text-2xl font-semibold tabular-nums">{ready ? value : '–'}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Export hub sections">
        <div className="flex min-w-max gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
              {ready && counts[t.id] ? (
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${tab === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                  {counts[t.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </nav>

      {tab === 'templates' && <TemplatesTab onCompose={setComposer} onSchedule={setSchedule} onOpenConnections={() => selectTab('connections')} />}
      {tab === 'connections' && <ConnectionsTab onConnect={setConnecting} />}
      {tab === 'schedules' && <SchedulesTab onEdit={setSchedule} />}
      {tab === 'links' && <SharesTab onCreate={() => setComposer({ templateId: 'monthly-summary', destination: 'link' })} />}
      {tab === 'history' && <HistoryTab onCompose={setComposer} />}

      <ExportComposer open={composer !== null} preset={composer ?? {}} onClose={() => setComposer(null)} onSchedule={setSchedule} />
      <ScheduleDialog initial={schedule} onClose={() => setSchedule(null)} />
      <ConnectDialog provider={connecting} onClose={() => setConnecting(null)} />
    </div>
  );
}
