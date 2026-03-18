'use client';

import { useState, cloneElement } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { MemberWithProfile } from '@/features/members/queries';

interface AddExpenseDialogProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  /** Custom trigger element. If omitted, renders the default "Add expense" primary button. */
  trigger?: React.ReactElement<{ onClick?: () => void }>;
}

export function AddExpenseDialog({ tripId, members, currentUserId, trigger }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  const triggerEl = trigger
    ? cloneElement(trigger, { onClick: () => setOpen(true) })
    : (
      <button
        onClick={() => setOpen(true)}
        className="btn-premium inline-flex items-center gap-2 text-[11px] h-11 px-6 rounded-2xl font-display font-bold uppercase tracking-widest shadow-premium active:scale-95 w-full sm:w-auto"
      >
        <Plus className="w-4 h-4" />
        Add Expense
      </button>
    );

  return (
    <>
      {triggerEl}

      {open && (
        <Dialog title="Add expense" onClose={() => setOpen(false)} maxWidth="max-w-xl">
          <ExpenseForm
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      )}
    </>
  );
}
