'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useExpenseActions } from '@/context/ExpenseActionsContext';
import SyncIndicator from './cloud/SyncIndicator';
import { ChartIcon, CloudIcon, ListIcon, PlusIcon, WalletIcon } from './icons';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: ChartIcon },
  { href: '/expenses', label: 'Expenses', icon: ListIcon },
  { href: '/exports', label: 'Exports', icon: CloudIcon },
];

export default function Navbar() {
  const pathname = usePathname();
  const { openAdd } = useExpenseActions();

  // Shared reports are opened by people who may not use Spendwise: show a minimal, read-only header.
  if (pathname === '/share') {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2.5 px-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <WalletIcon className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight text-slate-900">Spendwise</span>
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Shared report</span>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <WalletIcon className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Spendwise</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <SyncIndicator />
            <button onClick={openAdd} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Add expense</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur sm:hidden">
        <div className="grid grid-cols-3">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
