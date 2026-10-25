'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import ExpenseForm from '@/components/ExpenseForm';
import Modal from '@/components/Modal';
import { formatCurrency } from '@/lib/format';
import { StorageError } from '@/lib/storage';
import type { Expense, ExpenseInput } from '@/lib/types';
import { useExpenses } from './ExpensesContext';
import { useToast } from './ToastContext';

interface ExpenseActionsValue {
  openAdd: () => void;
  openEdit: (expense: Expense) => void;
  requestDelete: (expense: Expense) => void;
}

const ExpenseActionsContext = createContext<ExpenseActionsValue | null>(null);

type EditorState = { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; expense: Expense };

function failureMessage(err: unknown): string {
  return err instanceof StorageError ? err.message : 'Something went wrong. Please try again.';
}

/** Hosts the shared add/edit modal and delete confirmation so any page can trigger them. */
export function ExpenseActionsProvider({ children }: { children: ReactNode }) {
  const { addExpense, updateExpense, deleteExpense } = useExpenses();
  const { showToast } = useToast();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  const openAdd = useCallback(() => setEditor({ mode: 'add' }), []);
  const openEdit = useCallback((expense: Expense) => setEditor({ mode: 'edit', expense }), []);
  const requestDelete = useCallback((expense: Expense) => setPendingDelete(expense), []);
  const closeEditor = useCallback(() => setEditor({ mode: 'closed' }), []);

  const handleSubmit = (input: ExpenseInput) => {
    try {
      if (editor.mode === 'edit') {
        updateExpense(editor.expense.id, input);
        showToast('Expense updated');
      } else {
        addExpense(input);
        showToast(`Added ${formatCurrency(input.amount)} for ${input.description}`);
      }
      closeEditor();
    } catch (err) {
      showToast(failureMessage(err), 'error');
      throw err; // keep the form open with the user's input
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    try {
      deleteExpense(pendingDelete.id);
      showToast('Expense deleted');
    } catch (err) {
      showToast(failureMessage(err), 'error');
    }
    setPendingDelete(null);
  };

  const value = useMemo(() => ({ openAdd, openEdit, requestDelete }), [openAdd, openEdit, requestDelete]);

  return (
    <ExpenseActionsContext.Provider value={value}>
      {children}
      <Modal
        open={editor.mode !== 'closed'}
        onClose={closeEditor}
        title={editor.mode === 'edit' ? 'Edit expense' : 'Add expense'}
        description={editor.mode === 'edit' ? 'Update the details of this expense.' : 'Record a new expense.'}
      >
        {editor.mode !== 'closed' && (
          <ExpenseForm
            key={editor.mode === 'edit' ? editor.expense.id : 'new'}
            initial={editor.mode === 'edit' ? editor.expense : undefined}
            onSubmit={handleSubmit}
            onCancel={closeEditor}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete expense?"
        message={
          pendingDelete
            ? `“${pendingDelete.description}” (${formatCurrency(pendingDelete.amount)}) will be permanently removed.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </ExpenseActionsContext.Provider>
  );
}

export function useExpenseActions(): ExpenseActionsValue {
  const ctx = useContext(ExpenseActionsContext);
  if (!ctx) throw new Error('useExpenseActions must be used within ExpenseActionsProvider');
  return ctx;
}
