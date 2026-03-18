'use client';

import { useState, useTransition } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { PlaceVote, VoteType } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface VoteButtonsProps {
  tripId: string;
  placeId: string;
  upvotes: number;
  downvotes: number;
  userVote: PlaceVote | null;
}

export function VoteButtons({
  tripId,
  placeId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
}: VoteButtonsProps) {
  const [userVote, setUserVote] = useState<PlaceVote | null>(initialUserVote);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [isPending, startTransition] = useTransition();
  const loadingToast = useLoadingToast();

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

      const resolve = loadingToast('Saving vote…');

      try {
        if (isSameVote) {
          const res = await fetch('/api/votes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId, placeId }),
          });
          if (!res.ok) throw new Error('delete failed');
          resolve('Vote removed', 'success');
        } else {
          const res = await fetch('/api/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tripId, placeId, voteType }),
          });
          if (!res.ok) throw new Error('upsert failed');
          const data = await res.json();
          if (data.ok) setUserVote(data.data);
          resolve('Vote saved!', 'success');
        }
      } catch {
        // Rollback on error
        setUserVote(prevVote);
        setUpvotes(prevUp);
        setDownvotes(prevDown);
        resolve('Failed to save vote', 'error');
      }
    });
  }

  const activeUpvote = userVote?.vote_type === 'upvote';
  const activeDownvote = userVote?.vote_type === 'downvote';

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('upvote')}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 shadow-soft active:scale-95 group",
          activeUpvote 
            ? "bg-primary text-white shadow-premium" 
            : "bg-slate-50 text-slate-500 hover:bg-primary/10 hover:text-primary border border-slate-100"
        )}
      >
        <ThumbsUp className={cn("w-4 h-4 transition-transform", activeUpvote && "scale-110")} />
        <span className="font-display">{upvotes}</span>
      </button>

      <button
        onClick={() => handleVote('downvote')}
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-300 shadow-soft active:scale-95 group",
          activeDownvote 
            ? "bg-rose-500 text-white shadow-premium" 
            : "bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-500 border border-slate-100"
        )}
      >
        <ThumbsDown className={cn("w-4 h-4 transition-transform", activeDownvote && "scale-110")} />
        <span className="font-display">{downvotes}</span>
      </button>
    </div>
  );
}
