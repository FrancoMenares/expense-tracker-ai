'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { QR_MAX_LENGTH } from '@/lib/cloud/share';
import type { ShareRecord } from '@/lib/cloud/store';
import { formatDateTime, formatRelative } from '@/lib/cloud/time';
import { CheckIcon, ClockIcon, CopyIcon, DownloadIcon, LinkIcon, LockIcon } from '../icons';

export function useCopy() {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async (text: string, label = 'Link copied') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(label, 'info');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast('Could not access the clipboard. Copy the link manually.', 'error');
    }
  };
  return { copied, copy };
}

export function describeExpiry(expiresAt: string | null, now = new Date()): { label: string; expired: boolean } {
  if (!expiresAt) return { label: 'Never expires', expired: false };
  const expired = new Date(expiresAt) <= now;
  return { label: expired ? `Expired ${formatRelative(expiresAt, now)}` : `Expires ${formatRelative(expiresAt, now)}`, expired };
}

export default function ShareResult({ share }: { share: ShareRecord }) {
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);
  const fitsQr = share.url.length <= QR_MAX_LENGTH;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const expiry = describeExpiry(share.expiresAt);

  useEffect(() => {
    if (!fitsQr) return;
    let cancelled = false;
    QRCode.toDataURL(share.url, { errorCorrectionLevel: 'L', margin: 1, width: 240, color: { dark: '#0f172a', light: '#ffffff' } })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(null));
    return () => {
      cancelled = true;
    };
  }, [share.url, fitsQr]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3">
        <LinkIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
        <input
          readOnly
          value={share.url}
          onFocus={(e) => e.target.select()}
          aria-label="Shareable link"
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-700 outline-none"
        />
        <button onClick={() => copy(share.url)} className="btn-primary px-3 py-1.5">
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${expiry.expired ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
          <ClockIcon className="h-3.5 w-3.5" />
          {expiry.label}
          {share.expiresAt && !expiry.expired && <span className="text-slate-400">· {formatDateTime(share.expiresAt)}</span>}
        </span>
        {share.protected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            <LockIcon className="h-3.5 w-3.5" />
            Passcode protected
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          {share.recordCount} {share.recordCount === 1 ? 'record' : 'records'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start">
        {fitsQr ? (
          qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code for the shareable link" width={160} height={160} className="rounded-lg border border-slate-100" />
          ) : (
            <div className="h-40 w-40 animate-pulse rounded-lg bg-slate-100" />
          )
        ) : (
          <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
            Too much data to fit in a QR code. Share the link instead, or pick a summary template.
          </div>
        )}
        <div className="flex-1 space-y-2 text-sm text-slate-600">
          <p className="font-medium text-slate-900">Scan to open on another device</p>
          <p>
            The report lives <em>inside</em> the link, so nothing is uploaded and nobody needs an account to view it.
            {share.protected && ' Viewers will need the passcode, so send it separately.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {qr && (
              <a href={qr} download="spendwise-share-qr.png" className="btn-secondary px-3 py-1.5">
                <DownloadIcon className="h-4 w-4" />
                QR image
              </a>
            )}
            {canNativeShare && (
              <button
                onClick={() => navigator.share({ title: share.title, url: share.url }).catch(() => undefined)}
                className="btn-secondary px-3 py-1.5"
              >
                Share…
              </button>
            )}
            <a href={share.url} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-1.5">
              Open
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
