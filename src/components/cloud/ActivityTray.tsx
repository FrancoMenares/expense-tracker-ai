'use client';

import { useState } from 'react';
import { useCloud, type Job } from '@/context/CloudContext';
import { DESTINATIONS } from '@/lib/cloud/destinations';
import { CheckIcon, ChevronUpIcon, ClockIcon, CloudOffIcon, CopyIcon, XIcon } from '../icons';
import ProviderGlyph from './ProviderGlyph';
import { useCopy } from './ShareResult';

/** Floating panel listing background exports, like an upload manager in a cloud drive. */
export default function ActivityTray() {
  const { jobs, dismissJob } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  if (jobs.length === 0) return null;

  const running = jobs.filter((j) => j.status === 'running' || j.status === 'waiting').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const headline = running
    ? `Exporting ${running} ${running === 1 ? 'item' : 'items'}…`
    : failed
      ? `${failed} ${failed === 1 ? 'export' : 'exports'} failed`
      : `${jobs.length} ${jobs.length === 1 ? 'export' : 'exports'} complete`;

  return (
    <section
      aria-label="Export activity"
      className="fixed inset-x-4 bottom-20 z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[360px]"
    >
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-2.5 text-white">
        {running > 0 ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        ) : (
          <CheckIcon className="h-4 w-4 text-emerald-400" />
        )}
        <p className="flex-1 text-sm font-medium" aria-live="polite">
          {headline}
        </p>
        <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand activity' : 'Collapse activity'} className="rounded p-1 hover:bg-white/10">
          <ChevronUpIcon className={`h-4 w-4 transition ${collapsed ? '' : 'rotate-180'}`} />
        </button>
        {running === 0 && (
          <button onClick={() => jobs.forEach((j) => dismissJob(j.id))} aria-label="Dismiss all" className="rounded p-1 hover:bg-white/10">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {!collapsed && (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} onDismiss={() => dismissJob(job.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function JobRow({ job, onDismiss }: { job: Job; onDismiss: () => void }) {
  const { copy } = useCopy();
  const progress = job.status === 'succeeded' ? 100 : Math.round(((job.stageIndex + 0.5) / job.stages.length) * 100);
  const detail =
    job.status === 'waiting'
      ? 'Offline · will resume when you reconnect'
      : job.status === 'failed'
        ? job.error
        : job.status === 'succeeded'
          ? `Done · ${DESTINATIONS[job.destination].name}`
          : job.stages[job.stageIndex];

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <ProviderGlyph id={job.destination} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-slate-900">{job.title}</p>
          {job.trigger === 'schedule' && <ClockIcon className="h-3.5 w-3.5 flex-shrink-0 text-indigo-500" aria-label="Scheduled" />}
        </div>
        <p
          className={`mt-0.5 flex items-center gap-1 truncate text-xs ${
            job.status === 'failed' ? 'text-red-600' : job.status === 'waiting' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          {job.status === 'waiting' && <CloudOffIcon className="h-3.5 w-3.5" />}
          {detail}
        </p>
        {(job.status === 'running' || job.status === 'waiting') && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${job.status === 'waiting' ? 'bg-amber-400' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {job.status === 'succeeded' && job.result?.shareUrl && (
          <button onClick={() => copy(job.result!.shareUrl!)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            <CopyIcon className="h-3.5 w-3.5" /> Copy link
          </button>
        )}
      </div>
      {job.status !== 'running' && job.status !== 'waiting' && (
        <button onClick={onDismiss} aria-label="Dismiss" className="rounded p-0.5 text-slate-400 hover:text-slate-600">
          <XIcon className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
