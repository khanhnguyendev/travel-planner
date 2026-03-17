import type { Place, Category } from '@/lib/types';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { CategoryBadge } from '@/components/categories/category-badge';

interface VoteLeaderboardProps {
  places: Place[];
  voteSummaries: VoteSummaryEntry[];
  categories: Category[];
}

const rankBadge = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

export function VoteLeaderboard({ places, voteSummaries, categories }: VoteLeaderboardProps) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const summaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));

  const ranked = places
    .map((p) => {
      const s = summaryMap[p.id];
      const net = s ? s.upvotes - s.downvotes : 0;
      return { place: p, net, upvotes: s?.upvotes ?? 0, downvotes: s?.downvotes ?? 0 };
    })
    .filter((r) => r.net !== 0 || r.upvotes > 0 || r.downvotes > 0)
    .filter((r) => r.upvotes + r.downvotes > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 5);

  if (ranked.length < 2) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--color-text)' }}>
          Top picks
        </h3>
        <p className="text-sm text-stone-400 text-center py-4">
          Vote on places to see the leaderboard
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text)' }}>
        Top picks
      </h3>
      <div className="space-y-2">
        {ranked.map(({ place, net, upvotes, downvotes }, idx) => {
          const rank = idx + 1;
          const cat = categoryMap[place.category_id] ?? null;
          const badge = rankBadge(rank);
          const isEmoji = rank <= 3;

          return (
            <div
              key={place.id}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--color-bg-subtle)' }}
            >
              {/* Rank */}
              <div
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-sm font-bold rounded-lg"
                style={{
                  backgroundColor: isEmoji ? 'transparent' : 'var(--color-bg-muted)',
                  color: 'var(--color-text-muted)',
                  fontSize: isEmoji ? '18px' : '12px',
                }}
              >
                {badge}
              </div>

              {/* Name + category */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {place.name}
                </p>
                {cat && (
                  <div className="mt-0.5">
                    <CategoryBadge category={cat} size="sm" />
                  </div>
                )}
              </div>

              {/* Net votes */}
              <div className="flex-shrink-0 text-right">
                <div
                  className="text-sm font-bold"
                  style={{ color: net >= 0 ? '#0D9488' : '#EF4444' }}
                >
                  {net > 0 ? `+${net}` : net}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                  {upvotes}↑ {downvotes}↓
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
