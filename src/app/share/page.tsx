'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import ReportView from '@/components/cloud/ReportView';
import { AlertIcon, ClockIcon, DownloadIcon, LockIcon } from '@/components/icons';
import { downloadFile, toCsv } from '@/lib/cloud/files';
import { InvalidLinkError, PasscodeRequiredError, decodeSnapshot, isProtected, type Snapshot } from '@/lib/cloud/share';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'passcode'; error?: string }
  | { kind: 'error'; title: string; message: string }
  | { kind: 'ready'; snapshot: Snapshot };

/** Public, read-only viewer for snapshot links. Everything is decoded locally from the URL fragment. */
export default function SharePage() {
  const [token, setToken] = useState('');
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [passcode, setPasscode] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const open = useCallback(async (t: string, code?: string) => {
    try {
      const snapshot = await decodeSnapshot(t, code);
      if (snapshot.expiresAt && new Date(snapshot.expiresAt) <= new Date()) {
        setView({ kind: 'error', title: 'This link has expired', message: `It expired ${formatRelative(snapshot.expiresAt)}. Ask the sender for a new one.` });
      } else {
        setView({ kind: 'ready', snapshot });
      }
    } catch (err) {
      if (err instanceof PasscodeRequiredError) setView({ kind: 'passcode', error: code ? err.message : undefined });
      else setView({ kind: 'error', title: 'Link unavailable', message: err instanceof InvalidLinkError ? err.message : 'This link could not be opened.' });
    }
  }, []);

  useEffect(() => {
    const read = () => {
      const t = window.location.hash.slice(1);
      setToken(t);
      if (!t) setView({ kind: 'error', title: 'Nothing to show', message: 'This page displays reports shared from Spendwise. The link you followed is missing its data.' });
      else if (isProtected(t)) setView({ kind: 'passcode' });
      else void open(t);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [open]);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    await open(token, passcode);
    setUnlocking(false);
  };

  if (view.kind === 'loading') {
    return <div className="mx-auto h-64 max-w-4xl animate-pulse rounded-3xl bg-slate-200/60" aria-busy="true" />;
  }

  if (view.kind === 'passcode') {
    return (
      <form onSubmit={unlock} className="mx-auto mt-10 max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <LockIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">This report is protected</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the passcode the sender shared with you.</p>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          aria-label="Passcode"
          aria-invalid={Boolean(view.error)}
          className={`input mt-5 text-center ${view.error ? 'border-red-400' : ''}`}
        />
        {view.error && <p className="mt-2 text-sm text-red-600">{view.error}</p>}
        <button type="submit" disabled={!passcode || unlocking} className="btn-primary mt-4 w-full">
          {unlocking ? 'Decrypting…' : 'Unlock report'}
        </button>
        <p className="mt-4 text-xs text-slate-400">Decrypted in your browser. The passcode never leaves this device.</p>
      </form>
    );
  }

  if (view.kind === 'error') {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <AlertIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">{view.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{view.message}</p>
      </div>
    );
  }

  const { snapshot } = view;
  const downloadCsv = () =>
    downloadFile({
      name: `${snapshot.title.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').toLowerCase()}.csv`,
      mime: 'text/csv;charset=utf-8',
      content: '﻿' + toCsv(snapshot),
    });

  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Shared report</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{snapshot.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-slate-500">
            <span>Generated {formatDateTime(snapshot.generatedAt)}</span>
            {snapshot.expiresAt && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" /> Expires {formatRelative(snapshot.expiresAt)}
              </span>
            )}
          </p>
        </div>
        <button onClick={downloadCsv} className="btn-secondary">
          <DownloadIcon className="h-4 w-4" /> Download CSV
        </button>
      </header>
      <ReportView columns={snapshot.columns} rows={snapshot.rows} highlights={snapshot.highlights} />
      <p className="text-center text-xs text-slate-400">A read-only snapshot. The data is stored in the link itself, not on a server.</p>
    </article>
  );
}
