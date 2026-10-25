'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useCloud } from '@/context/CloudContext';
import { DESTINATIONS, DESTINATION_IDS, OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/cloud/destinations';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';
import { BoltIcon, CheckIcon } from '../../icons';
import ProviderGlyph from '../ProviderGlyph';
import { Panel, StatusDot, Toggle } from './shared';

export default function ConnectionsTab({ onConnect }: { onConnect: (provider: OAuthProviderId) => void }) {
  const { state, disconnect, setLiveSync } = useCloud();
  const [confirm, setConfirm] = useState<OAuthProviderId | null>(null);
  const builtIn = DESTINATION_IDS.filter((id) => ['local', 'share', 'email'].includes(DESTINATIONS[id].kind));
  const soon = DESTINATION_IDS.filter((id) => DESTINATIONS[id].kind === 'soon');
  const scheduleCount = (id: OAuthProviderId) => state.schedules.filter((s) => s.destination === id && s.enabled).length;

  return (
    <div className="space-y-10">
      <Panel title="Cloud apps" description="Connect once, then send exports with a click or on a schedule.">
        <div className="grid gap-4 md:grid-cols-3">
          {OAUTH_PROVIDERS.map((id) => {
            const spec = DESTINATIONS[id];
            const c = state.connections[id];
            return (
              <article key={id} className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${c ? 'border-emerald-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <ProviderGlyph id={id} size="lg" />
                  {c && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <StatusDot status={c.status} />
                      {c.status === 'syncing' ? 'Syncing' : c.status === 'error' ? 'Error' : 'Connected'}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{spec.name}</h3>
                <p className="text-sm text-slate-500">{spec.blurb}</p>

                {c ? (
                  <div className="mt-4 flex flex-1 flex-col gap-3 text-sm">
                    <dl className="space-y-1 text-xs text-slate-500">
                      <div className="flex justify-between gap-2">
                        <dt>Account</dt>
                        <dd className="truncate font-medium text-slate-700">{c.account}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Last sync</dt>
                        <dd className="font-medium text-slate-700" title={c.lastSyncAt ? formatDateTime(c.lastSyncAt) : undefined}>
                          {c.status === 'syncing' ? 'Syncing now…' : c.lastSyncAt ? formatRelative(c.lastSyncAt) : 'Never'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Active schedules</dt>
                        <dd className="font-medium text-slate-700">{scheduleCount(id)}</dd>
                      </div>
                    </dl>
                    {spec.supportsLiveSync && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                        <span>
                          <span className="flex items-center gap-1 text-sm font-medium text-slate-900">
                            <BoltIcon className="h-4 w-4 text-amber-500" /> Live sync
                          </span>
                          <span className="block text-xs text-slate-500">Push changes as you add or edit expenses</span>
                        </span>
                        <Toggle checked={c.liveSync} onChange={(v) => setLiveSync(id, v)} label="Live sync" />
                      </div>
                    )}
                    <button onClick={() => setConfirm(id)} className="mt-auto self-start text-xs font-medium text-slate-500 hover:text-red-600">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button onClick={() => onConnect(id)} className="btn-secondary mt-4 self-start">
                    Connect
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="Built in" description="Always available, no account needed.">
        <div className="grid gap-3 sm:grid-cols-3">
          {builtIn.map((id) => (
            <div key={id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <ProviderGlyph id={id} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  {DESTINATIONS[id].name} <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                </p>
                <p className="truncate text-xs text-slate-500">{DESTINATIONS[id].blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Coming soon">
        <div className="grid gap-3 sm:grid-cols-3">
          {soon.map((id) => (
            <div key={id} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 opacity-80">
              <ProviderGlyph id={id} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{DESTINATIONS[id].name}</p>
                <p className="truncate text-xs text-slate-500">{DESTINATIONS[id].blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        title={`Disconnect ${confirm ? DESTINATIONS[confirm].name : ''}?`}
        message={
          confirm && scheduleCount(confirm) > 0
            ? `${scheduleCount(confirm)} active schedule(s) deliver here and will fail until you reconnect.`
            : 'You can reconnect at any time.'
        }
        confirmLabel="Disconnect"
        onConfirm={() => {
          if (confirm) disconnect(confirm);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
