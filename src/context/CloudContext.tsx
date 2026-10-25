'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DESTINATIONS, isOAuth, jobStages, parseRecipients, type DestinationId, type OAuthProviderId } from '@/lib/cloud/destinations';
import { buildFile, byteSize, downloadFile, type ExportFile } from '@/lib/cloud/files';
import { nextRun } from '@/lib/cloud/schedule';
import { encodeSnapshot } from '@/lib/cloud/share';
import {
  CLOUD_STORAGE_KEY,
  EMPTY_CLOUD_STATE,
  HISTORY_LIMIT,
  MAX_RETAINED_FILE_BYTES,
  loadCloudState,
  saveCloudState,
  type CloudState,
  type Connection,
  type ExportRequest,
  type HistoryEntry,
  type Schedule,
  type ShareRecord,
  type SyncStatus,
} from '@/lib/cloud/store';
import { TEMPLATES, resolvePeriod } from '@/lib/cloud/templates';
import { generateId } from '@/lib/storage';
import { useExpenses } from './ExpensesContext';
import { useToast } from './ToastContext';

export type JobStatus = 'waiting' | 'running' | 'succeeded' | 'failed';

/** A background export in flight (or recently finished), shown in the activity tray. */
export interface Job {
  id: string;
  title: string;
  destination: DestinationId;
  trigger: ExportRequest['trigger'];
  stages: string[];
  stageIndex: number;
  status: JobStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  result?: { historyId: string; shareUrl?: string };
}

export type ScheduleInput = Omit<Schedule, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt'> & { id?: string };

interface CloudContextValue {
  state: CloudState;
  ready: boolean;
  online: boolean;
  jobs: Job[];
  /** Worst status across connections, for the global sync indicator. */
  syncStatus: SyncStatus | 'idle';
  connect: (provider: OAuthProviderId, account: string) => void;
  disconnect: (provider: OAuthProviderId) => void;
  setLiveSync: (provider: OAuthProviderId, enabled: boolean) => void;
  runExport: (request: ExportRequest) => Promise<Job>;
  dismissJob: (id: string) => void;
  saveSchedule: (input: ScheduleInput) => Schedule;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  runScheduleNow: (id: string) => void;
  removeShare: (id: string) => void;
  clearHistory: () => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

const SCHEDULER_INTERVAL_MS = 15_000;
const LIVE_SYNC_DEBOUNCE_MS = 1_200;
const AUTO_DISMISS_MS = 12_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function waitForOnline(): Promise<void> {
  return new Promise((resolve) => window.addEventListener('online', () => resolve(), { once: true }));
}

function successMessage(destination: DestinationId, title: string, target: string, file: ExportFile, rows: number): string {
  switch (destination) {
    case 'download':
      return `Downloaded ${file.name}`;
    case 'link':
      return `Snapshot link for ${title} is ready`;
    case 'email': {
      const to = parseRecipients(target);
      return `${title} sent to ${to.length === 1 ? to[0] : `${to.length} recipients`}`;
    }
    case 'google-sheets':
      return `Wrote ${rows} rows to “${target}”`;
    default:
      return `Uploaded ${file.name} to ${DESTINATIONS[destination].name}`;
  }
}

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses, isLoading } = useExpenses();
  const { showToast } = useToast();
  const [state, setState] = useState<CloudState>(EMPTY_CLOUD_STATE);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  // Load after mount (localStorage is client-only) and follow other tabs.
  useEffect(() => {
    setState(loadCloudState());
    setReady(true);
    setOnline(navigator.onLine);
    const onStorage = (e: StorageEvent) => e.key === CLOUD_STORAGE_KEY && setState(loadCloudState());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (ready) saveCloudState(state);
  }, [state, ready]);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const dismissJob = useCallback((id: string) => setJobs((list) => list.filter((j) => j.id !== id)), []);

  const setConnection = useCallback((provider: OAuthProviderId, patch: Partial<Connection>) => {
    setState((s) => {
      const existing = s.connections[provider];
      return existing ? { ...s, connections: { ...s.connections, [provider]: { ...existing, ...patch } } } : s;
    });
  }, []);

  const runExport = useCallback(
    async (request: ExportRequest): Promise<Job> => {
      const now = new Date();
      const template = TEMPLATES[request.templateId];
      const period = resolvePeriod(request.templateId, request.periodId, expensesRef.current, now);
      const output = template.build(expensesRef.current, period, now);
      const job: Job = {
        id: request.jobId ?? generateId(),
        title: request.templateId === 'full-backup' ? template.name : `${template.name} · ${period.label}`,
        destination: request.destination,
        trigger: request.trigger,
        stages: jobStages(request.destination, request.target, { rows: output.rows.length, encrypted: !!request.share?.passcode }),
        stageIndex: 0,
        status: 'running',
        startedAt: now.toISOString(),
      };
      setJobs((list) => [job, ...list]);

      const record = (patch: Pick<HistoryEntry, 'status'> & Partial<HistoryEntry>): HistoryEntry => {
        const entry: HistoryEntry = {
          id: generateId(),
          templateId: request.templateId,
          periodId: period.id,
          periodLabel: period.label,
          destination: request.destination,
          target: request.target,
          trigger: request.trigger,
          scheduleId: request.scheduleId,
          format: request.format,
          startedAt: job.startedAt,
          finishedAt: new Date().toISOString(),
          recordCount: output.recordCount,
          bytes: 0,
          ...patch,
        };
        setState((s) => ({ ...s, history: [entry, ...s.history].slice(0, HISTORY_LIMIT) }));
        return entry;
      };

      const fail = (error: string): Job => {
        const entry = record({ status: 'failed', error });
        const finished = { ...job, status: 'failed' as const, error, finishedAt: entry.finishedAt, result: { historyId: entry.id } };
        updateJob(job.id, finished);
        showToast(`${job.title}: ${error}`, 'error');
        return finished;
      };

      const provider = isOAuth(request.destination) ? request.destination : null;
      if (provider && !stateRef.current.connections[provider]) {
        return fail(`${DESTINATIONS[provider].name} is not connected`);
      }

      // Cloud deliveries queue while offline and resume automatically once the network returns.
      if (request.destination !== 'download' && !navigator.onLine) {
        updateJob(job.id, { status: 'waiting' });
        await waitForOnline();
        updateJob(job.id, { status: 'running' });
      }

      if (provider) setConnection(provider, { status: 'syncing' });
      const pace = request.destination === 'download' ? 250 : 650;
      try {
        for (let i = 0; i < job.stages.length; i++) {
          updateJob(job.id, { stageIndex: i });
          await delay(pace + Math.random() * pace * 0.6);
        }

        const file = buildFile(output, request.format, now);
        let share: ShareRecord | undefined;
        if (request.destination === 'link') {
          const expiresInDays = request.share?.expiresInDays ?? null;
          const expiresAt = expiresInDays ? new Date(now.getTime() + expiresInDays * 86_400_000).toISOString() : null;
          const token = await encodeSnapshot(
            {
              v: 1,
              title: output.title,
              periodLabel: output.periodLabel,
              generatedAt: now.toISOString(),
              expiresAt,
              columns: output.columns,
              rows: output.rows,
              highlights: output.highlights,
            },
            request.share?.passcode || undefined,
          );
          share = {
            id: generateId(),
            title: output.title,
            url: `${window.location.origin}/share#${token}`,
            createdAt: now.toISOString(),
            expiresAt,
            protected: Boolean(request.share?.passcode),
            recordCount: output.recordCount,
          };
          const created = share;
          setState((s) => ({ ...s, shares: [created, ...s.shares] }));
        }
        if (request.destination === 'download') downloadFile(file);
        if (provider) setConnection(provider, { status: 'synced', lastSyncAt: new Date().toISOString() });

        const bytes = byteSize(file.content);
        const entry = record({
          status: 'succeeded',
          bytes,
          file: bytes <= MAX_RETAINED_FILE_BYTES ? file : undefined,
          shareId: share?.id,
        });
        const finished: Job = {
          ...job,
          stageIndex: job.stages.length,
          status: 'succeeded',
          finishedAt: entry.finishedAt,
          result: { historyId: entry.id, shareUrl: share?.url },
        };
        updateJob(job.id, finished);
        showToast(successMessage(request.destination, job.title, request.target, file, output.rows.length));
        setTimeout(() => dismissJob(job.id), AUTO_DISMISS_MS);
        return finished;
      } catch (err) {
        console.error('Export failed', err);
        if (provider) setConnection(provider, { status: 'error' });
        return fail('Something went wrong. Try again.');
      }
    },
    [dismissJob, setConnection, showToast, updateJob],
  );

  // Scheduler: runs due schedules while the app is open, catching up once on missed runs.
  const runDueSchedules = useCallback(() => {
    const now = new Date();
    const due = stateRef.current.schedules.filter((s) => s.enabled && new Date(s.nextRunAt) <= now);
    if (due.length === 0) return;
    setState((s) => ({
      ...s,
      schedules: s.schedules.map((sch) =>
        due.some((d) => d.id === sch.id) ? { ...sch, lastRunAt: now.toISOString(), nextRunAt: nextRun(sch, now).toISOString() } : sch,
      ),
    }));
    for (const s of due) {
      const periods = TEMPLATES[s.templateId].periods(expensesRef.current, now);
      void runExport({
        templateId: s.templateId,
        periodId: periods[s.periodIndex]?.id ?? periods[0].id,
        destination: s.destination,
        target: s.target,
        format: s.format,
        trigger: 'schedule',
        scheduleId: s.id,
      });
    }
  }, [runExport]);

  useEffect(() => {
    if (!ready || isLoading) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      runDueSchedules();
      interval = setInterval(runDueSchedules, SCHEDULER_INTERVAL_MS);
    };
    // With several tabs open, elect one leader so a due schedule runs once, not once per tab.
    // Other tabs queue on the lock and take over if the leader tab closes.
    if (!navigator.locks) {
      start();
      return () => clearInterval(interval);
    }
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const abort = new AbortController();
    navigator.locks
      .request('spendwise-scheduler', { signal: abort.signal }, () => {
        start();
        return held;
      })
      .catch(() => undefined); // aborted on unmount while still queued
    return () => {
      abort.abort();
      release();
      clearInterval(interval);
    };
  }, [ready, isLoading, runDueSchedules]);

  // Live sync: when expenses change, push to connections that opted in.
  const firstExpenses = useRef(true);
  useEffect(() => {
    if (isLoading) return;
    if (firstExpenses.current) {
      firstExpenses.current = false;
      return;
    }
    const live = (Object.values(stateRef.current.connections) as Connection[]).filter((c) => c.liveSync);
    if (live.length === 0) return;
    live.forEach((c) => setConnection(c.provider, { status: 'syncing' }));
    const id = setTimeout(() => {
      live.forEach((c) => setConnection(c.provider, { status: 'synced', lastSyncAt: new Date().toISOString() }));
    }, LIVE_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [expenses, isLoading, setConnection]);

  const connect = useCallback((provider: OAuthProviderId, account: string) => {
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      connections: { ...s.connections, [provider]: { provider, account, connectedAt: now, lastSyncAt: now, status: 'synced', liveSync: false } },
    }));
  }, []);

  const disconnect = useCallback((provider: OAuthProviderId) => {
    setState((s) => {
      const connections = { ...s.connections };
      delete connections[provider];
      return { ...s, connections };
    });
  }, []);

  const setLiveSync = useCallback(
    (provider: OAuthProviderId, enabled: boolean) => setConnection(provider, { liveSync: enabled }),
    [setConnection],
  );

  const saveSchedule = useCallback((input: ScheduleInput): Schedule => {
    const now = new Date();
    const existing = input.id ? stateRef.current.schedules.find((s) => s.id === input.id) : undefined;
    const schedule: Schedule = {
      ...input,
      id: existing?.id ?? generateId(),
      createdAt: existing?.createdAt ?? now.toISOString(),
      lastRunAt: existing?.lastRunAt ?? null,
      nextRunAt: nextRun(input, now).toISOString(),
    };
    setState((s) => ({
      ...s,
      schedules: existing ? s.schedules.map((x) => (x.id === schedule.id ? schedule : x)) : [...s.schedules, schedule],
    }));
    return schedule;
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    const now = new Date();
    setState((s) => ({
      ...s,
      schedules: s.schedules.map((x) =>
        // Re-enabling recomputes the next run so a paused schedule doesn't fire immediately for missed slots.
        x.id === id ? { ...x, enabled: !x.enabled, nextRunAt: nextRun(x, now).toISOString() } : x,
      ),
    }));
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    setState((s) => ({ ...s, schedules: s.schedules.filter((x) => x.id !== id) }));
  }, []);

  const runScheduleNow = useCallback(
    (id: string) => {
      const s = stateRef.current.schedules.find((x) => x.id === id);
      if (!s) return;
      const periods = TEMPLATES[s.templateId].periods(expensesRef.current, new Date());
      setState((st) => ({
        ...st,
        schedules: st.schedules.map((x) => (x.id === id ? { ...x, lastRunAt: new Date().toISOString() } : x)),
      }));
      void runExport({
        templateId: s.templateId,
        periodId: periods[s.periodIndex]?.id ?? periods[0].id,
        destination: s.destination,
        target: s.target,
        format: s.format,
        trigger: 'schedule',
        scheduleId: s.id,
      });
    },
    [runExport],
  );

  const removeShare = useCallback((id: string) => {
    setState((s) => ({ ...s, shares: s.shares.filter((x) => x.id !== id) }));
  }, []);

  const clearHistory = useCallback(() => setState((s) => ({ ...s, history: [] })), []);

  const syncStatus = useMemo<CloudContextValue['syncStatus']>(() => {
    const statuses = (Object.values(state.connections) as Connection[]).map((c) => c.status);
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('syncing') || jobs.some((j) => j.status === 'running' && isOAuth(j.destination))) return 'syncing';
    return statuses.length ? 'synced' : 'idle';
  }, [state.connections, jobs]);

  const value = useMemo<CloudContextValue>(
    () => ({
      state,
      ready,
      online,
      jobs,
      syncStatus,
      connect,
      disconnect,
      setLiveSync,
      runExport,
      dismissJob,
      saveSchedule,
      toggleSchedule,
      deleteSchedule,
      runScheduleNow,
      removeShare,
      clearHistory,
    }),
    [state, ready, online, jobs, syncStatus, connect, disconnect, setLiveSync, runExport, dismissJob, saveSchedule, toggleSchedule, deleteSchedule, runScheduleNow, removeShare, clearHistory],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error('useCloud must be used within CloudProvider');
  return ctx;
}
