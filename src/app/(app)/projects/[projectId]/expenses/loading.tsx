import { Skeleton } from '@/components/ui/skeleton';

export default function ExpensesLoading() {
  return (
    <div>
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-36 mb-6" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Expense rows skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 p-4"
          >
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/3" />
            </div>
            <Skeleton className="h-5 w-20 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
