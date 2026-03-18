'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { MemberWithProfile } from '@/features/members/queries';

interface AddExpenseDialogProps {
  projectId: string;
  members: MemberWithProfile[];
  currentUserId: string;
}

export function AddExpenseDialog({ projectId, members, currentUserId }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary inline-flex items-center gap-1.5 text-sm min-h-[44px]"
      >
        <Plus className="w-4 h-4" />
        Add expense
      </button>

      {open && (
        <Dialog title="Add expense" onClose={() => setOpen(false)} maxWidth="max-w-xl">
          <ExpenseForm
            projectId={projectId}
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
