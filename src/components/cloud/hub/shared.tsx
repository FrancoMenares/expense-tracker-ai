import type { ReactNode } from 'react';

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

export function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyPanel({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">{icon}</span>
      <p className="mt-3 font-medium text-slate-900">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: 'synced' | 'syncing' | 'error' | 'idle' }) {
  const cls = { synced: 'bg-emerald-500', syncing: 'bg-indigo-500 animate-pulse', error: 'bg-red-500', idle: 'bg-slate-300' }[status];
  return <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${cls}`} />;
}
