'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { MemberWithProfile } from '@/features/members/queries';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AddExpenseDialogProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  places?: Place[];
  triggerLabel?: string;
  triggerClassName?: string;
}

export function AddExpenseDialog({
  tripId,
  members,
  currentUserId,
  places,
  triggerLabel = 'Add expense',
  triggerClassName,
}: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'btn-primary inline-flex min-h-[44px] items-center gap-1.5 text-sm',
          triggerClassName
        )}
      >
        <Plus className="w-4 h-4" />
        {triggerLabel}
      </button>

      {open && (
        <Dialog title="Add expense" onClose={() => setOpen(false)} maxWidth="max-w-xl">
          <ExpenseForm
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            places={places}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      )}
    </>
  );
}
