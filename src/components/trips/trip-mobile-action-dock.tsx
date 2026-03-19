'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MapPin, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [expanded, setExpanded] = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!canEdit) return null;

  return (
    <>
      {showAddPlace && (
        <Dialog title="Add a place" onClose={() => setShowAddPlace(false)} maxWidth="sm:max-w-lg">
          <AddPlaceForm
            tripId={tripId}
            categories={categories}
            onAdded={() => {
              setExpanded(false);
              setShowAddPlace(false);
              router.refresh();
            }}
            onCancel={() => setShowAddPlace(false)}
          />
        </Dialog>
      )}

      {expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-20 bg-transparent md:hidden"
          aria-label="Close quick actions"
        />
      )}

      <div className="pointer-events-none fixed bottom-0 right-0 z-30 p-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] md:hidden">
        <div className="pointer-events-auto relative flex flex-col items-end gap-3">
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
            triggerIcon={<Receipt className="h-4 w-4" />}
            onTriggerClick={() => setExpanded(false)}
            triggerClassName={cn(
              'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/80 bg-white/96 px-4 py-3 text-sm font-semibold text-stone-900 shadow-[0_18px_36px_rgba(10,12,17,0.14)] backdrop-blur-xl transition-all duration-200',
              expanded
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none translate-y-4 scale-95 opacity-0'
            )}
          />

          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setShowAddPlace(true);
            }}
            className={cn(
              'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(10,12,17,0.22)] transition-all duration-200',
              expanded
                ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'pointer-events-none translate-y-4 scale-95 opacity-0'
            )}
          >
            <MapPin className="h-4 w-4" />
            Add place
          </button>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={cn(
              'inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_18px_42px_rgba(10,12,17,0.22)] transition-all duration-200',
              expanded ? 'bg-stone-900' : 'hero-orb'
            )}
            aria-expanded={expanded}
            aria-label={expanded ? 'Close quick actions' : 'Open quick actions'}
          >
            <Plus className={cn('h-6 w-6 transition-transform duration-200', expanded && 'rotate-45')} />
          </button>
        </div>
      </div>
    </>
  );
}
