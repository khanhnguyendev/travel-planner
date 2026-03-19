'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ExpenseForm } from '@/components/expenses/expense-form';
import type { MemberWithProfile } from '@/features/members/queries';
import type { Place } from '@/lib/types';
import { cn } from '@/lib/utils';
import { emitTripSectionRefresh } from '@/components/trips/trip-refresh';
import { TRIP_REFRESH_SECTIONS } from '@/components/trips/trip-refresh-keys';

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startRefreshTransition] = useTransition();

  function handleSuccess() {
    setOpen(false);
    emitTripSectionRefresh(tripId, [
      TRIP_REFRESH_SECTIONS.budget,
      TRIP_REFRESH_SECTIONS.crew,
      TRIP_REFRESH_SECTIONS.expenses,
      TRIP_REFRESH_SECTIONS.activity,
      TRIP_REFRESH_SECTIONS.places,
      TRIP_REFRESH_SECTIONS.timeline,
      TRIP_REFRESH_SECTIONS.map,
    ]);
    startRefreshTransition(() => {
      router.refresh();
    });
  }

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
        <Dialog title="Add expense" onClose={() => setOpen(false)} maxWidth="sm:max-w-xl">
          <ExpenseForm
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            places={places}
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        </Dialog>
      )}
    </>
  );
}
