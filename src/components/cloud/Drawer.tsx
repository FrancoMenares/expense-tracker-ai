'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { XIcon } from '../icons';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Right-hand slide-over panel. */
export default function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      // Let nested dialogs (e.g. the connect screen) handle Escape first.
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[data-nested-dialog]')) onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Lets the toast stack move beside the drawer instead of covering its footer actions.
    document.body.dataset.drawerOpen = '';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      delete document.body.dataset.drawerOpen;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl animate-slide-in-right flex-col bg-white shadow-2xl outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="-mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-slate-100 bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
