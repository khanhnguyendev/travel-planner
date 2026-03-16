import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import type { VoteSummaryEntry } from '@/features/votes/queries';

interface VoteSummaryProps {
  summary: VoteSummaryEntry | null;
  compact?: boolean;
}

export function VoteSummary({ summary, compact = false }: VoteSummaryProps) {
  if (!summary) {
    return (
      <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
        No votes yet
      </span>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {summary.upvotes > 0 && (
          <span className="flex items-center gap-0.5">
            <ThumbsUp className="w-3 h-3" style={{ color: 'var(--color-primary)' }} />
            {summary.upvotes}
          </span>
        )}
        {summary.downvotes > 0 && (
          <span className="flex items-center gap-0.5">
            <ThumbsDown className="w-3 h-3" style={{ color: 'var(--color-secondary)' }} />
            {summary.downvotes}
          </span>
        )}
        {summary.avgScore != null && (
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-current" style={{ color: '#EAB308' }} />
            {summary.avgScore.toFixed(1)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-sm">
        <ThumbsUp className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        <span style={{ color: 'var(--color-text)' }}>{summary.upvotes}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>upvotes</span>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <ThumbsDown className="w-4 h-4" style={{ color: 'var(--color-secondary)' }} />
        <span style={{ color: 'var(--color-text)' }}>{summary.downvotes}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>downvotes</span>
      </div>

      {summary.avgScore != null && (
        <div className="flex items-center gap-1.5 text-sm">
          <Star
            className="w-4 h-4 fill-current"
            style={{ color: '#EAB308' }}
          />
          <span style={{ color: 'var(--color-text)' }}>
            {summary.avgScore.toFixed(1)}
          </span>
          <span style={{ color: 'var(--color-text-muted)' }}>
            avg ({summary.scoreCount})
          </span>
        </div>
      )}
    </div>
  );
}
