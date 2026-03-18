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
    <div className="section-shell p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-subtle)' }}>
            Top picks
          </p>
          <h3 className="mt-1 text-lg font-semibold section-title" style={{ color: 'var(--color-text)' }}>
            The shortlist with the strongest group momentum
          </h3>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-0.5 px-0.5">
        {ranked.map(({ place, net, upvotes, downvotes }, idx) => {
          const cat = categoryMap[place.category_id] ?? null;
          const emoji = RANK_EMOJI[idx] ?? `#${idx + 1}`;

          return (
            <div
              key={place.id}
              className="metric-tile flex min-w-[220px] max-w-[260px] flex-shrink-0 items-start gap-3 px-4 py-4"
              style={{
                backgroundColor: 'rgba(255,255,255,0.78)',
              }}
            >
              <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
                {emoji}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text)' }}>
                  {place.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{ color: net >= 0 ? '#0D9488' : '#EF4444' }}
                  >
                    {net > 0 ? `+${net}` : net}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                    {upvotes}↑ {downvotes}↓
                  </span>
                </div>
                {cat && (
                  <div className="mt-2">
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
