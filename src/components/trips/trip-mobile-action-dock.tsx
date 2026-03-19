'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { AddMoneyDialog } from '@/components/trips/add-money-dialog';
import { AddPlaceForm } from '@/components/places/add-place-form';
import type { MemberWithProfile } from '@/features/members/queries';
import type { Category, Place } from '@/lib/types';

interface TripMobileActionDockProps {
  tripId: string;
  canEdit: boolean;
  members: MemberWithProfile[];
  currentUserId: string;
  places: Place[];
  categories: Category[];
  budget: number | null;
  budgetCurrency: string;
  canManageBudget: boolean;
}

export function TripMobileActionDock({
  tripId,
  canEdit,
  members,
  currentUserId,
  places,
  categories,
  budget,
  budgetCurrency,
  canManageBudget,
}: TripMobileActionDockProps) {
  const router = useRouter();
  const [showAddPlace, setShowAddPlace] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      {showAddPlace && (
        <Dialog title="Add a place" onClose={() => setShowAddPlace(false)} maxWidth="max-w-lg">
          <AddPlaceForm
            tripId={tripId}
            categories={categories}
            onAdded={() => {
              setShowAddPlace(false);
              router.refresh();
            }}
            onCancel={() => setShowAddPlace(false)}
          />
        </Dialog>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] md:hidden">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-[1.5rem] border border-white/70 bg-white/86 p-2 shadow-[0_18px_44px_rgba(10,12,17,0.14)] backdrop-blur-xl">
          <AddMoneyDialog
            tripId={tripId}
            members={members}
            currentUserId={currentUserId}
            places={places}
            budget={budget}
            budgetCurrency={budgetCurrency}
            canManageBudget={canManageBudget}
            initialTab="expense"
            triggerLabel="Add expense"
            triggerClassName="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[1rem] bg-white px-4 py-3 text-sm font-semibold text-stone-900 shadow-sm"
          />

          <button
            type="button"
            onClick={() => setShowAddPlace(true)}
            className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[1rem] bg-stone-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(10,12,17,0.16)]"
          >
            <Plus className="h-4 w-4" />
            Add place
          </button>
        </div>
      </div>
    </>
  );
}
