import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface VoteSummaryProps {
  summary: VoteSummaryEntry | null;
  compact?: boolean;
}

export function VoteSummary({ summary, compact = false }: VoteSummaryProps) {
  if (!summary) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2.5 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest">
        {summary.upvotes > 0 && (
          <span className="flex items-center gap-1 text-primary">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="font-display">{summary.upvotes}</span>
          </span>
        )}
        {summary.downvotes > 0 && (
          <span className="flex items-center gap-1 text-rose-500">
            <ThumbsDown className="w-3.5 h-3.5" />
            <span className="font-display">{summary.downvotes}</span>
          </span>
        )}
        {summary.avgScore != null && (
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="font-display">{summary.avgScore.toFixed(1)}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 text-sm">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <ThumbsUp className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-display font-bold text-foreground leading-none">{summary.upvotes}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Upvotes</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
          <ThumbsDown className="w-4 h-4 text-rose-500" />
        </div>
        <div>
          <p className="font-display font-bold text-foreground leading-none">{summary.downvotes}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Downvotes</p>
        </div>
      </div>

      {summary.avgScore != null && (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-500 fill-current" />
          </div>
          <div>
            <p className="font-display font-bold text-foreground leading-none">{summary.avgScore.toFixed(1)}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rating ({summary.scoreCount})</p>
          </div>
        </div>
      )}
    </div>
  );
}
