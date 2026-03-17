'use client';

import { useState, useTransition, useEffect } from 'react';
import { Link2, X, Loader2, AlertCircle } from 'lucide-react';
import type { Category, Place, PlaceReview } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';

interface AddPlaceFormProps {
  projectId: string;
  categories: Category[];
  onAdded?: (place: Place, reviews: PlaceReview[]) => void;
  onCancel?: () => void;
}

export function AddPlaceForm({
  projectId,
  categories,
  onAdded,
  onCancel,
}: AddPlaceFormProps) {
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  // Sync when categories load after initial render
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isPending, startTransition] = useTransition();
  const loadingToast = useLoadingToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please paste a Google Maps URL');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    const resolve = loadingToast('Resolving place…');

    startTransition(async () => {
      try {
        const res = await fetch('/api/places/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            categoryId,
            googleMapsUrl: url.trim(),
          }),
        });

        const data = await res.json();

        if (!data.ok) {
          const code = data.error?.code ?? 'server_error';
          let msg = data.error?.message ?? 'Failed to resolve place.';
          if (code === 'rate_limited') msg = 'Google Places rate limit reached — try again in a moment.';
          else if (code === 'conflict') msg = 'This place has already been added.';
          resolve(msg, 'error');
          setError(msg);
          return;
        }

        setUrl('');
        resolve('Place added!', 'success');
        onAdded?.(data.data.place, data.data.reviews ?? []);
      } catch {
        const msg = 'Network error — check your connection and try again.';
        resolve(msg, 'error');
        setError(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="maps-url"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Google Maps link
        </label>
        <div className="relative">
          <Link2
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--color-text-subtle)' }}
          />
          <input
            id="maps-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            required
            disabled={isPending}
            className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              borderColor: 'var(--color-border)',
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties}
          />
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-subtle)' }}>
          Paste a link from Google Maps — place pages and short links both work.
        </p>
      </div>

      <div>
        <label
          htmlFor="category-select"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Category
        </label>
        {categories.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No categories yet — add one first.
          </p>
        ) : (
          <select
            id="category-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            disabled={isPending}
            className="w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 bg-white"
            style={{
              borderColor: 'var(--color-border)',
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}
                {cat.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl text-sm"
          style={{
            backgroundColor: '#FEF2F2',
            color: 'var(--color-error)',
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending || categories.length === 0}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resolving…
            </>
          ) : (
            'Add place'
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-sm px-3 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
