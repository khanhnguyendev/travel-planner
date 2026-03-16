import { Skeleton } from '@/components/ui/skeleton';

export default function ExpenseDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link skeleton */}
      <Skeleton className="h-4 w-36" />

      {/* Header card skeleton */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <Skeleton className="h-1.5 w-full rounded-none" />
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-2/3" />
              <div className="flex items-center gap-4 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <div className="text-right space-y-1">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-3.5 w-12 ml-auto" />
            </div>
          </div>
          <div className="flex gap-2 pt-4 border-t border-stone-100">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Splits card skeleton */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-stone-50"
            >
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-10 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
