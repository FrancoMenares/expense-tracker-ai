'use client';

import { useEffect, useState } from 'react';
import { useCloud } from '@/context/CloudContext';
import { DESTINATIONS, isValidEmail, type OAuthProviderId } from '@/lib/cloud/destinations';
import { CheckIcon, InfoIcon, WalletIcon, XIcon } from '../icons';
import ProviderGlyph from './ProviderGlyph';

interface ConnectDialogProps {
  provider: OAuthProviderId | null;
  onClose: () => void;
  onConnected?: (provider: OAuthProviderId) => void;
}

type Phase = 'consent' | 'connecting' | 'done';

/**
 * Simulated OAuth consent screen. It mirrors the real flow (permissions, account, redirect)
 * but never asks for a password and makes no network requests.
 */
export default function ConnectDialog({ provider, onClose, onConnected }: ConnectDialogProps) {
  return provider ? <ConnectDialogBody provider={provider} onClose={onClose} onConnected={onConnected} /> : null;
}

function ConnectDialogBody({ provider, onClose, onConnected }: ConnectDialogProps & { provider: OAuthProviderId }) {
  const { connect } = useCloud();
  const spec = DESTINATIONS[provider];
  const [account, setAccount] = useState('');
  const [phase, setPhase] = useState<Phase>('consent');
  const valid = isValidEmail(account);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'consent') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const allow = () => {
    if (!valid) return;
    setPhase('connecting');
    setTimeout(() => {
      connect(provider, account.trim());
      setPhase('done');
      setTimeout(() => {
        onConnected?.(provider);
        onClose();
      }, 900);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4" data-nested-dialog>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/50 backdrop-blur-sm" onClick={phase === 'consent' ? onClose : undefined} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        className="relative w-full max-w-sm animate-slide-up overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Fake browser chrome to signal the "redirect" to the provider */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </span>
          <span className="flex-1 truncate rounded-md bg-white px-2 py-0.5 text-center font-mono text-[11px] text-slate-500 ring-1 ring-slate-200">
            accounts.{provider.replace('google-sheets', 'google')}.example/oauth/authorize
          </span>
          {phase === 'consent' && (
            <button onClick={onClose} aria-label="Cancel" className="text-slate-400 hover:text-slate-600">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
              <WalletIcon className="h-6 w-6" />
            </span>
            <span className="flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${phase === 'connecting' ? 'animate-pulse bg-indigo-500' : 'bg-slate-300'}`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
            <ProviderGlyph id={provider} size="lg" />
          </div>

          {phase === 'done' ? (
            <div className="py-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckIcon className="h-6 w-6" />
              </span>
              <p id="connect-title" className="mt-3 font-semibold text-slate-900">
                Connected to {spec.name}
              </p>
              <p className="text-sm text-slate-500">{account}</p>
            </div>
          ) : (
            <>
              <h2 id="connect-title" className="text-center text-base font-semibold text-slate-900">
                Spendwise wants to access your {spec.name} account
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {spec.scopes?.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                    {s}
                  </li>
                ))}
              </ul>
              <label className="mt-5 block">
                <span className="label">Account email</span>
                <input
                  type="email"
                  data-autofocus
                  autoFocus
                  value={account}
                  disabled={phase === 'connecting'}
                  onChange={(e) => setAccount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && allow()}
                  placeholder="you@example.com"
                  className="input"
                />
              </label>
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-500">
                <InfoIcon className="mt-px h-3.5 w-3.5 flex-shrink-0" />
                Demo sign-in: no password is requested and nothing is sent to {spec.name}.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button onClick={onClose} disabled={phase === 'connecting'} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={allow} disabled={!valid || phase === 'connecting'} className="btn-primary">
                  {phase === 'connecting' ? 'Connecting…' : 'Allow'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
