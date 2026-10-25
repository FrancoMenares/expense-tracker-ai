'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from '@/components/icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastType, { icon: ReactNode; className: string }> = {
  success: { icon: <CheckCircleIcon className="h-5 w-5 text-emerald-500" />, className: 'border-emerald-200' },
  error: { icon: <XCircleIcon className="h-5 w-5 text-red-500" />, className: 'border-red-200' },
  info: { icon: <InfoIcon className="h-5 w-5 text-indigo-500" />, className: 'border-indigo-200' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${TOAST_STYLES[toast.type].className}`}
          >
            {TOAST_STYLES[toast.type].icon}
            <p className="flex-1 text-sm font-medium text-slate-800">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="rounded text-slate-400 hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
