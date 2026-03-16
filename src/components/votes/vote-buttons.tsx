'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { PlaceVote, VoteType } from '@/lib/types';

interface VoteButtonsProps {
  projectId: string;
  placeId: string;
  upvotes: number;
  downvotes: number;
  userVote: PlaceVote | null;
}

export function VoteButtons({
  projectId,
  placeId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
}: VoteButtonsProps) {
  const [userVote, setUserVote] = useState<PlaceVote | null>(initialUserVote);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [isPending, startTransition] = useTransition();

  function handleVote(voteType: VoteType) {
    startTransition(async () => {
      const isSameVote = userVote?.vote_type === voteType;

      // Optimistic update
      const prevVote = userVote;
      const prevUp = upvotes;
      const prevDown = downvotes;

      if (isSameVote) {
        setUserVote(null);
        if (voteType === 'upvote') setUpvotes((v) => v - 1);
        else setDownvotes((v) => v - 1);
      } else {
        // Undo previous vote counts
        if (prevVote?.vote_type === 'upvote') setUpvotes((v) => v - 1);
        if (prevVote?.vote_type === 'downvote') setDownvotes((v) => v - 1);
        // Apply new vote
        setUserVote({ vote_type: voteType } as PlaceVote);
        if (voteType === 'upvote') setUpvotes((v) => v + 1);
        else setDownvotes((v) => v + 1);
      }

      try {
        if (isSameVote) {
          const res = await fetch('/api/votes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, placeId }),
          });
          if (!res.ok) throw new Error('delete failed');
        } else {
          const res = await fetch('/api/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, placeId, voteType }),
          });
          if (!res.ok) throw new Error('upsert failed');
          const data = await res.json();
          if (data.ok) setUserVote(data.data);
        }
      } catch {
        // Rollback on error
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
      }
    });
  }

  const activeUpvote = userVote?.vote_type === 'upvote';
  const activeDownvote = userVote?.vote_type === 'downvote';

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleVote('upvote')}
        disabled={isPending}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: activeUpvote
            ? 'var(--color-primary)'
            : 'var(--color-bg-subtle)',
          color: activeUpvote
            ? 'var(--color-primary-foreground)'
            : 'var(--color-text-muted)',
        }}
        aria-label="Upvote"
        aria-pressed={activeUpvote}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
        <span>{upvotes}</span>
      </button>

      <button
        onClick={() => handleVote('downvote')}
        disabled={isPending}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: activeDownvote
            ? 'var(--color-secondary)'
            : 'var(--color-bg-subtle)',
          color: activeDownvote
            ? 'var(--color-secondary-foreground)'
            : 'var(--color-text-muted)',
        }}
        aria-label="Downvote"
        aria-pressed={activeDownvote}
      >
        <ThumbsDown className="w-3.5 h-3.5" />
        <span>{downvotes}</span>
      </button>
    </div>
  );
}
