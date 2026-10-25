'use client';

import { useState, type FormEvent } from 'react';
import { CATEGORY_META } from '@/lib/categories';
import { todayISO } from '@/lib/format';
import { CATEGORIES, type Category, type Expense, type ExpenseInput } from '@/lib/types';

interface ExpenseFormProps {
  initial?: Expense;
  /** Should throw if the expense could not be saved; the form then stays open. */
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

interface FormValues {
  date: string;
  amount: string;
  category: Category | '';
  description: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const MAX_AMOUNT = 1_000_000;
const MAX_DESCRIPTION = 100;
const MIN_DATE = '2000-01-01';

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const amount = values.amount.trim().replace(/,/g, '');

  if (!amount) {
    errors.amount = 'Amount is required.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    errors.amount = 'Enter a valid amount with up to 2 decimals.';
  } else if (Number(amount) <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  } else if (Number(amount) > MAX_AMOUNT) {
    errors.amount = 'Amount must be $1,000,000 or less.';
  }

  if (!values.date) {
    errors.date = 'Date is required.';
  } else if (values.date > todayISO()) {
    errors.date = 'Date cannot be in the future.';
  } else if (values.date < MIN_DATE) {
    errors.date = 'Date must be in the year 2000 or later.';
  }

  if (!values.category) errors.category = 'Choose a category.';

  const description = values.description.trim();
  if (!description) {
    errors.description = 'Description is required.';
  } else if (description.length > MAX_DESCRIPTION) {
    errors.description = `Keep it under ${MAX_DESCRIPTION} characters.`;
  }

  return errors;
}

export default function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState<FormValues>({
    date: initial?.date ?? todayISO(),
    amount: initial ? initial.amount.toFixed(2) : '',
    category: initial?.category ?? '',
    description: initial?.description ?? '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);

  const errors = validate(values);
  const showError = (field: keyof FormValues) => (touched[field] ? errors[field] : undefined);

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) =>
    setValues((v) => ({ ...v, [field]: value }));
  const touch = (field: keyof FormValues) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ date: true, amount: true, category: true, description: true });
    if (Object.keys(errors).length > 0 || !values.category) return;

    setSubmitting(true);
    try {
      onSubmit({
        date: values.date,
        amount: Number(values.amount.trim().replace(/,/g, '')),
        category: values.category,
        description: values.description.trim(),
      });
    } catch {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormValues) =>
    `input ${showError(field) ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="amount" className="label">
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              data-autofocus
              value={values.amount}
              onChange={(e) => set('amount', e.target.value)}
              onBlur={() => touch('amount')}
              aria-invalid={!!showError('amount')}
              aria-describedby="amount-error"
              className={`${inputClass('amount')} pl-7 tabular-nums`}
            />
          </div>
          <FieldError id="amount-error" message={showError('amount')} />
        </div>

        <div>
          <label htmlFor="date" className="label">
            Date
          </label>
          <input
            id="date"
            type="date"
            min={MIN_DATE}
            max={todayISO()}
            value={values.date}
            onChange={(e) => set('date', e.target.value)}
            onBlur={() => touch('date')}
            aria-invalid={!!showError('date')}
            aria-describedby="date-error"
            className={inputClass('date')}
          />
          <FieldError id="date-error" message={showError('date')} />
        </div>
      </div>

      <fieldset>
        <legend className="label">Category</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map((category) => {
            const selected = values.category === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  set('category', category);
                  touch('category');
                }}
                aria-pressed={selected}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition ${
                  selected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span aria-hidden="true">{CATEGORY_META[category].icon}</span>
                {category}
              </button>
            );
          })}
        </div>
        <FieldError message={showError('category')} />
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="description" className="label">
            Description
          </label>
          <span
            className={`text-xs tabular-nums ${
              values.description.trim().length > MAX_DESCRIPTION ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {values.description.trim().length}/{MAX_DESCRIPTION}
          </span>
        </div>
        <input
          id="description"
          type="text"
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          onBlur={() => touch('description')}
          aria-invalid={!!showError('description')}
          aria-describedby="description-error"
          className={inputClass('description')}
        />
        <FieldError id="description-error" message={showError('description')} />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {initial ? 'Save changes' : 'Add expense'}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  return (
    <p id={id} className="mt-1.5 min-h-[1rem] text-xs text-red-600" role={message ? 'alert' : undefined}>
      {message}
    </p>
  );
}
