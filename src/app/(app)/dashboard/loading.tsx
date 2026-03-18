import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div>
      {/* Page header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* 3-column trip card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-stone-100 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="flex items-center gap-4 pt-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
