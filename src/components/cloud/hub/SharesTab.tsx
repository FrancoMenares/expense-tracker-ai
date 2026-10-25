'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { useCloud } from '@/context/CloudContext';
import type { ShareRecord } from '@/lib/cloud/store';
import { formatRelative } from '@/lib/cloud/time';
import { CopyIcon, InfoIcon, LinkIcon, LockIcon, PlusIcon, XIcon } from '../../icons';
import ShareResult, { describeExpiry, useCopy } from '../ShareResult';
import { EmptyPanel, Panel } from './shared';

export default function SharesTab({ onCreate }: { onCreate: () => void }) {
  const { state, removeShare } = useCloud();
  const { copy } = useCopy();
  const [open, setOpen] = useState<ShareRecord | null>(null);

  return (
    <Panel
      title="Shared links"
      description="Read-only snapshots anyone with the link (and passcode) can open, with no account required."
      action={
        <button onClick={onCreate} className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New link
        </button>
      }
    >
      <p className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-900">
        <InfoIcon className="mt-px h-4 w-4 flex-shrink-0" />
        <span>
          Snapshot links carry the report inside the link itself and are never uploaded. That also means a link can&apos;t be revoked once
          sent: removing it here only forgets it on this device. For sensitive data, use a short expiry and a passcode.
        </span>
      </p>

      {state.shares.length === 0 ? (
        <EmptyPanel icon={<LinkIcon className="h-6 w-6" />} title="No links yet">
          Share a monthly summary with a partner, or a tax report with your accountant, via link or QR code.
        </EmptyPanel>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {state.shares.map((s) => {
            const expiry = describeExpiry(s.expiresAt);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${expiry.expired ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                  {s.protected ? <LockIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${expiry.expired ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{s.title}</p>
                  <p className="text-xs text-slate-500">
                    Created {formatRelative(s.createdAt)} · <span className={expiry.expired ? 'text-red-600' : ''}>{expiry.label}</span> · {s.recordCount} records
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!expiry.expired && (
                    <>
                      <button onClick={() => copy(s.url)} className="btn-secondary px-2.5 py-1.5 text-xs">
                        <CopyIcon className="h-3.5 w-3.5" /> Copy
                      </button>
                      <button onClick={() => setOpen(s)} className="btn-secondary px-2.5 py-1.5 text-xs">
                        QR &amp; details
                      </button>
                    </>
                  )}
                  <button onClick={() => removeShare(s.id)} aria-label={`Forget ${s.title}`} title="Forget this link" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={open !== null} onClose={() => setOpen(null)} title={open?.title ?? ''} description="Snapshot link">
        {open && <ShareResult share={open} />}
      </Modal>
    </Panel>
  );
}
