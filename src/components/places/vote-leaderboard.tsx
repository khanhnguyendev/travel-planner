import type { Place, Category } from '@/lib/types';
import type { VoteSummaryEntry } from '@/features/votes/queries';
import { CategoryBadge } from '@/components/categories/category-badge';

interface VoteLeaderboardProps {
  places: Place[];
  voteSummaries: VoteSummaryEntry[];
  categories: Category[];
}

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

export function VoteLeaderboard({ places, voteSummaries, categories }: VoteLeaderboardProps) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const summaryMap = Object.fromEntries(voteSummaries.map((v) => [v.placeId, v]));

  const ranked = places
    .map((p) => {
      const s = summaryMap[p.id];
      const net = s ? s.upvotes - s.downvotes : 0;
      return { place: p, net, upvotes: s?.upvotes ?? 0, downvotes: s?.downvotes ?? 0 };
    })
    .filter((r) => r.upvotes + r.downvotes > 0)
    .sort((a, b) => b.net - a.net)
    .slice(0, 5);

  if (ranked.length < 2) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-subtle)' }}>
        Top picks
      </p>

      {/* Horizontal scrollable strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {ranked.map(({ place, net, upvotes, downvotes }, idx) => {
          const cat = categoryMap[place.category_id] ?? null;
          const emoji = RANK_EMOJI[idx] ?? `#${idx + 1}`;

          return (
            <div
              key={place.id}
              className="flex-shrink-0 flex items-start gap-2 px-3 py-2.5 rounded-2xl border min-w-[140px] max-w-[180px]"
              style={{
                backgroundColor: 'white',
                borderColor: 'var(--color-border)',
              }}
            >
              {/* Rank */}
              <span className="text-lg leading-none mt-0.5 flex-shrink-0">{emoji}</span>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                  {place.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-xs font-bold"
                    style={{ color: net >= 0 ? '#0D9488' : '#EF4444' }}
                  >
                    {net > 0 ? `+${net}` : net}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    {upvotes}↑ {downvotes}↓
                  </span>
                </div>
                {cat && (
                  <div className="mt-1">
                    <CategoryBadge category={cat} size="sm" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
