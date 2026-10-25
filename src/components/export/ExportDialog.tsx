'use client';

import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import Modal from '@/components/Modal';
import { AlertIcon, DownloadIcon, InfoIcon } from '@/components/icons';
import { CategoryBadge } from '@/components/ui';
import { useExpenses } from '@/context/ExpensesContext';
import { useToast } from '@/context/ToastContext';
import { CATEGORY_META } from '@/lib/categories';
import {
  EXPORT_FORMATS,
  buildExport,
  countByCategory,
  downloadBlob,
  isValidRange,
  sanitizeFilename,
  selectExpenses,
  summarize,
  type ExportFormat,
} from '@/lib/export';
import { formatCurrency, formatDate } from '@/lib/format';
import { CATEGORIES } from '@/lib/types';
import { DATE_PRESETS, useExportOptions, type ExportInitialOptions } from './useExportOptions';

const PREVIEW_LIMIT = 100;

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: ExportInitialOptions;
  /** Optional context shown above the options, e.g. which page filters were carried over. */
  notice?: string;
}

export default function ExportDialog({ open, ...props }: ExportDialogProps) {
  // Mount the body only while open so every opening starts from fresh options.
  return open ? <ExportDialogBody {...props} /> : null;
}

function ExportDialogBody({ onClose, initial, notice }: Omit<ExportDialogProps, 'open'>) {
  const { expenses } = useExpenses();
  const { showToast, dismissAll } = useToast();
  const [state, dispatch] = useExportOptions(initial);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toasts sit above modals and would cover the footer actions (e.g. a lingering "Exported…" toast on reopen).
  useEffect(dismissAll, [dismissAll]);

  const rangeValid = isValidRange(state);
  const selected = useMemo(() => (rangeValid ? selectExpenses(expenses, state) : []), [expenses, state, rangeValid]);
  const summary = useMemo(() => summarize(selected), [selected]);
  const categoryCounts = useMemo(() => countByCategory(expenses, state), [expenses, state]);

  const spec = EXPORT_FORMATS[state.format];
  const cleanFilename = sanitizeFilename(state.filename, state.format);
  const blocker = !rangeValid
    ? 'Start date must be on or before the end date.'
    : state.categories.length === 0
      ? 'Select at least one category.'
      : summary.count === 0
        ? 'No expenses match these filters.'
        : !cleanFilename
          ? 'Enter a filename.'
          : null;

  const close = () => {
    if (!isExporting) onClose();
  };

  const handleExport = async () => {
    if (blocker) return;
    setIsExporting(true);
    setError(null);
    try {
      const { blob, filename } = await buildExport({
        expenses: selected,
        summary,
        options: { ...state, filename: cleanFilename },
        generatedAt: new Date(),
      });
      downloadBlob(blob, filename);
      showToast(`Exported ${summary.count} ${summary.count === 1 ? 'expense' : 'expenses'} to ${filename}`);
      onClose();
    } catch (err) {
      console.error('Export failed', err);
      setError('Something went wrong while generating the file. Please try again.');
      setIsExporting(false);
    }
  };

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500" aria-live="polite">
        {blocker ? (
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <AlertIcon className="h-4 w-4" />
            {blocker}
          </span>
        ) : (
          <>
            <span className="font-medium text-slate-900">{summary.count}</span> {summary.count === 1 ? 'record' : 'records'}
            {' · '}
            <span className="font-medium text-slate-900">{formatCurrency(summary.total)}</span>
            {' · '}
            <span className="font-mono text-xs">
              {cleanFilename}.{spec.extension}
            </span>
          </>
        )}
      </p>
      <div className="flex gap-2 sm:flex-shrink-0">
        <button onClick={close} disabled={isExporting} className="btn-secondary flex-1 sm:flex-none">
          Cancel
        </button>
        <button
          onClick={handleExport}
          disabled={Boolean(blocker) || isExporting}
          className="btn-primary flex-1 sm:min-w-[150px] sm:flex-none"
        >
          {isExporting ? (
            <>
              <Spinner />
              Generating {spec.label}…
            </>
          ) : (
            <>
              <DownloadIcon className="h-4 w-4" />
              Export {spec.label}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={close}
      size="xl"
      title="Export expenses"
      description="Choose a format, narrow down the data, and preview exactly what will be exported."
      footer={footer}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5" aria-busy={isExporting}>
        <fieldset disabled={isExporting} className="space-y-6 lg:col-span-2">
          {notice && (
            <p className="flex items-start gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              <InfoIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {notice}
            </p>
          )}

          <Section title="Format">
            <div role="radiogroup" aria-label="Export format" className="grid gap-2">
              {(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map((format) => (
                <FormatOption
                  key={format}
                  format={format}
                  checked={state.format === format}
                  onSelect={() => dispatch({ type: 'format', format })}
                />
              ))}
            </div>
          </Section>

          <Section title="Date range">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => dispatch({ type: 'preset', preset: p.id })}
                  aria-pressed={state.preset === p.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    state.preset === p.id
                      ? 'bg-indigo-600 text-white ring-indigo-600'
                      : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField
                label="From"
                value={state.startDate}
                max={state.endDate || undefined}
                invalid={!rangeValid}
                onChange={(value) => dispatch({ type: 'date', field: 'startDate', value })}
              />
              <DateField
                label="To"
                value={state.endDate}
                min={state.startDate || undefined}
                invalid={!rangeValid}
                onChange={(value) => dispatch({ type: 'date', field: 'endDate', value })}
              />
            </div>
          </Section>

          <Section
            title="Categories"
            action={
              <div className="flex gap-3 text-xs font-medium">
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
                  disabled={state.categories.length === CATEGORIES.length}
                  onClick={() => dispatch({ type: 'categories', categories: [...CATEGORIES] })}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
                  disabled={state.categories.length === 0}
                  onClick={() => dispatch({ type: 'categories', categories: [] })}
                >
                  Clear
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((category) => {
                const checked = state.categories.includes(category);
                return (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => dispatch({ type: 'toggleCategory', category })}
                      className="h-4 w-4 accent-indigo-600"
                    />
                    <span aria-hidden="true">{CATEGORY_META[category].icon}</span>
                    <span className="flex-1 truncate text-slate-700">{category}</span>
                    <span className="text-xs tabular-nums text-slate-400">{categoryCounts[category]}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          <Section title="Filename">
            <div className="flex rounded-lg shadow-sm">
              <input
                aria-label="Filename"
                value={state.filename}
                onChange={(e) => dispatch({ type: 'filename', filename: e.target.value })}
                spellCheck={false}
                className="input rounded-r-none shadow-none"
              />
              <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 font-mono text-sm text-slate-500">
                .{spec.extension}
              </span>
            </div>
          </Section>
        </fieldset>

        <div className="space-y-4 lg:col-span-3">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Records" value={summary.count.toLocaleString('en-US')} />
            <Stat label="Total" value={formatCurrency(summary.total)} />
            <Stat
              label="Span"
              value={
                summary.firstDate && summary.lastDate
                  ? summary.firstDate === summary.lastDate
                    ? formatDate(summary.firstDate)
                    : `${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}`
                  : '—'
              }
              small
            />
          </div>

          {summary.byCategory.length > 0 && (
            <div>
              <div className="flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                {summary.byCategory.map((c) => (
                  <div
                    key={c.category}
                    style={{ width: `${(c.amount / summary.total) * 100}%`, backgroundColor: CATEGORY_META[c.category].color }}
                  />
                ))}
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {summary.byCategory.map((c) => (
                  <li key={c.category} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c.category].color }} />
                    {c.category} <span className="tabular-nums text-slate-700">{formatCurrency(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PreviewTable expenses={selected} total={summary.count} />

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const FORMAT_BADGE: Record<ExportFormat, string> = {
  csv: 'bg-emerald-100 text-emerald-700',
  json: 'bg-amber-100 text-amber-700',
  pdf: 'bg-red-100 text-red-700',
};

function FormatOption({ format, checked, onSelect }: { format: ExportFormat; checked: boolean; onSelect: () => void }) {
  const spec = EXPORT_FORMATS[format];
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-indigo-500/20 ${
        checked ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <input type="radio" name="export-format" checked={checked} onChange={onSelect} className="sr-only" />
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold ${FORMAT_BADGE[format]}`}
        aria-hidden="true"
      >
        {spec.label}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{spec.label}</span>
        <span className="block text-xs text-slate-500">{spec.description}</span>
      </span>
    </label>
  );
}

function DateField(props: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-600">
        {props.label}
      </label>
      <input
        id={id}
        type="date"
        value={props.value}
        min={props.min}
        max={props.max}
        aria-invalid={props.invalid}
        onChange={(e) => props.onChange(e.target.value)}
        className={`input ${props.invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
      />
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums text-slate-900 ${small ? 'text-sm leading-5' : 'truncate text-lg'}`} title={value}>
        {value}
      </p>
    </div>
  );
}

function PreviewTable({ expenses, total }: { expenses: ReturnType<typeof selectExpenses>; total: number }) {
  const rows = expenses.slice(0, PREVIEW_LIMIT);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
        <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
        <span className="text-xs text-slate-500">
          {total > PREVIEW_LIMIT ? `First ${PREVIEW_LIMIT} of ${total.toLocaleString('en-US')} rows` : `${total} ${total === 1 ? 'row' : 'rows'}`}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-slate-500">Nothing to export with the current filters.</div>
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 shadow-[inset_0_-1px_0] shadow-slate-200">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-2">
                    <CategoryBadge category={e.category} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums text-slate-900">
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-2 text-slate-600" title={e.description}>
                    {e.description || <span className="text-slate-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
