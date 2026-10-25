'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCloud } from '@/context/CloudContext';
import { DESTINATIONS } from '@/lib/cloud/destinations';
import type { Connection } from '@/lib/cloud/store';
import { formatRelative } from '@/lib/cloud/time';
import { CloudCheckIcon, CloudIcon, CloudOffIcon } from '../icons';
import ProviderGlyph from './ProviderGlyph';

const STATUS_DOT = {
  synced: 'bg-emerald-500',
  syncing: 'bg-indigo-500 animate-pulse',
  error: 'bg-red-500',
  idle: 'bg-slate-300',
};

/** Navbar cloud button with a popover summarizing connection health. */
export default function SyncIndicator() {
  const { state, ready, online, syncStatus } = useCloud();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const connections = Object.values(state.connections) as Connection[];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!ready) return null;

  const status = online ? syncStatus : 'error';
  const Icon = !online ? CloudOffIcon : syncStatus === 'synced' ? CloudCheckIcon : CloudIcon;
  const label = !online
    ? 'Offline'
    : syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
        ? 'Sync issue'
        : syncStatus === 'synced'
          ? 'All synced'
          : 'No apps connected';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Cloud sync: ${label}`}
        title={label}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <Icon className={`h-5 w-5 ${syncStatus === 'syncing' && online ? 'animate-pulse text-indigo-600' : ''}`} />
        <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${STATUS_DOT[status]}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 animate-slide-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
            <p className="text-sm font-semibold text-slate-900">{label}</p>
          </div>
          {!online && (
            <p className="bg-amber-50 px-4 py-2.5 text-xs text-amber-800">You&apos;re offline. Cloud exports are queued and will resume automatically.</p>
          )}
          {connections.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-500">Connect Google Sheets, Dropbox or OneDrive to send exports straight to the cloud.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {connections.map((c) => (
                <li key={c.provider} className="flex items-center gap-3 px-4 py-2.5">
                  <ProviderGlyph id={c.provider} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{DESTINATIONS[c.provider].name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {c.status === 'syncing' ? 'Syncing…' : c.status === 'error' ? 'Last sync failed' : c.lastSyncAt ? `Synced ${formatRelative(c.lastSyncAt)}` : 'Connected'}
                      {c.liveSync && ' · Live'}
                    </p>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[c.status]}`} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/exports#connections"
            onClick={(e) => {
              setOpen(false);
              // Client-side navigation to a hash on the same page doesn't fire hashchange, so set it directly.
              if (pathname === '/exports') {
                e.preventDefault();
                window.location.hash = 'connections';
              }
            }}
            className="block border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Manage connections
          </Link>
        </div>
      )}
    </div>
  );
}
