import Link from 'next/link';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { TripExpenseStat } from '@/features/profile/queries';

interface UserExpenseSummaryProps {
  stats: TripExpenseStat[];
}

export function UserExpenseSummary({ stats }: UserExpenseSummaryProps) {
  if (stats.length === 0) return null;

  const positiveCount = stats.filter((s) => s.net > 0).length;
  const negativeCount = stats.filter((s) => s.net < 0).length;

  return (
    <div className="section-shell p-5 space-y-4">
      <div className="border-b pb-3" style={{ borderColor: 'var(--color-border-muted)' }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            Expense Summary
          </h2>
        </div>
        {(positiveCount > 0 || negativeCount > 0) && (
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            {positiveCount > 0 && `Owed in ${positiveCount} trip${positiveCount > 1 ? 's' : ''}`}
            {positiveCount > 0 && negativeCount > 0 && ' · '}
            {negativeCount > 0 && `Owes in ${negativeCount} trip${negativeCount > 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {stats.map((stat) => {
          const isPositive = stat.net > 0;
          const isNegative = stat.net < 0;
          return (
            <Link
              key={`${stat.tripId}-${stat.currency}`}
              href={`/trips/${stat.tripId}/expenses`}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-stone-50 metric-tile"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {stat.tripTitle}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>
                  Paid {formatCurrency(stat.paid, stat.currency)}
                  {' · '}
                  Share {formatCurrency(stat.share, stat.currency)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-sm font-bold"
                  style={{
                    color: isPositive ? '#0D9488' : isNegative ? '#EF4444' : 'var(--color-text-subtle)',
                  }}
                >
                  {isPositive ? '+' : ''}
                  {formatCurrency(stat.net, stat.currency)}
                </span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--color-text-subtle)' }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
