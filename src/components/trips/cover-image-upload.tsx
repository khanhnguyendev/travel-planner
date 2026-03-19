'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, X } from 'lucide-react';
import { updateTrip } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { RefreshOverlay } from '@/components/ui/refresh-overlay';
import { cn } from '@/lib/utils';
import { buildPublicStorageUrl, normalizePublicStorageUrl } from '@/lib/storage';

interface CoverImageUploadProps {
  tripId: string;
  currentCoverUrl?: string | null;
  height?: number;
  variant?: 'panel' | 'identity';
}

export function CoverImageUpload({
  tripId,
  currentCoverUrl,
  height = 200,
  variant = 'panel',
}: CoverImageUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl ?? null);
  const [imageFailed, setImageFailed] = useState(false);
  const loadingToast = useLoadingToast();

  useEffect(() => {
    setPreviewUrl(normalizePublicStorageUrl(currentCoverUrl) ?? null);
    setImageFailed(false);
  }, [currentCoverUrl, tripId]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const resolve = loadingToast('Uploading cover image…');

    try {
      const res = await fetch('/api/uploads/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, filename: file.name, contentType: file.type }),
      });

      const json = (await res.json()) as {
        ok: boolean;
        data?: { uploadUrl: string; coverPath: string };
        error?: { message: string };
      };

      if (!res.ok || !json.ok || !json.data) {
        resolve(json.error?.message ?? 'Failed to get upload URL', 'error');
        return;
      }

      const { uploadUrl, coverPath } = json.data;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) { resolve('Upload failed', 'error'); return; }

      const publicUrl = buildPublicStorageUrl('covers', coverPath);
      const result = await updateTrip(tripId, { cover_image_url: publicUrl });

      if (result.ok) {
        setPreviewUrl(`${normalizePublicStorageUrl(publicUrl) ?? publicUrl}?v=${Date.now()}`);
        setImageFailed(false);
        resolve('Cover image updated!', 'success');
        startRefreshTransition(() => {
          router.refresh();
        });
      } else {
        resolve(result.error ?? 'Failed to save cover image', 'error');
      }
    } catch {
      resolve('Upload failed', 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setRemoving(true);
    const resolve = loadingToast('Removing cover image…');
    try {
      const result = await updateTrip(tripId, { cover_image_url: null });
      if (result.ok) {
        setPreviewUrl(null);
        setImageFailed(false);
        resolve('Cover image removed', 'success');
        startRefreshTransition(() => {
          router.refresh();
        });
      } else {
        resolve(result.error ?? 'Failed to remove cover image', 'error');
      }
    } catch {
      resolve('Failed to remove cover image', 'error');
    } finally {
      setRemoving(false);
    }
  }

  const mutationPending = uploading || removing;
  const busy = mutationPending || isRefreshing;
  const identityMode = variant === 'identity';
  const displayUrl = imageFailed ? null : (normalizePublicStorageUrl(previewUrl) ?? previewUrl);

  return (
    <div className={cn('relative group', identityMode ? 'h-full w-full' : '')}>
      <div
        className={cn(
          'w-full cursor-pointer',
          identityMode ? 'absolute inset-0 overflow-hidden' : 'flex items-center justify-center'
        )}
        style={{ height: identityMode ? undefined : height, backgroundColor: previewUrl || identityMode ? undefined : 'var(--color-bg-subtle)' }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busy) inputRef.current?.click(); }
        }}
        aria-label="Upload cover image"
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={displayUrl}
            src={displayUrl}
            alt="Cover"
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : identityMode ? (
          <div className="hero-orb h-full w-full" />
        ) : null}

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 transition-opacity',
            identityMode ? 'flex items-center justify-center' : 'flex flex-col items-center justify-center'
          )}
          style={{
            backgroundColor: displayUrl
              ? (identityMode ? 'rgba(10,12,17,0.22)' : 'rgba(0,0,0,0.35)')
              : 'transparent',
            opacity: mutationPending ? 1 : undefined,
          }}
        >
          {mutationPending ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : !identityMode ? (
            <div
              className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: displayUrl ? undefined : 1 }}
            >
              <Camera className="w-8 h-8" style={{ color: displayUrl ? 'white' : 'var(--color-text-subtle)' }} />
              <span className="text-sm font-medium" style={{ color: displayUrl ? 'white' : 'var(--color-text-muted)' }}>
                {displayUrl ? 'Change cover' : 'Add cover image'}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!busy) inputRef.current?.click();
        }}
        className={cn(
          'absolute inline-flex items-center justify-center rounded-full shadow-sm transition-all',
          identityMode
            ? 'right-4 top-4 z-20 h-11 w-11 bg-white/90 text-stone-700 backdrop-blur-sm hover:bg-white'
            : 'left-1/2 top-1/2 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 bg-white/90 text-stone-700 opacity-0 group-hover:opacity-100'
        )}
        aria-label={displayUrl ? 'Change cover image' : 'Add cover image'}
        title={displayUrl ? 'Change cover image' : 'Add cover image'}
      >
        <Camera className={identityMode ? 'h-5 w-5' : 'h-4 w-4'} />
      </button>

      {/* Remove button — only shown when a cover exists */}
      {displayUrl && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          className={cn(
            'absolute transition-all',
            identityMode
              ? 'right-[4.25rem] top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-stone-950/60 text-white backdrop-blur-sm hover:bg-red-600'
              : 'top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 hover:bg-red-600'
          )}
          style={identityMode ? undefined : { backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}
          aria-label="Remove cover image"
          title="Remove cover image"
        >
          <X className="w-3.5 h-3.5" />
          {!identityMode && 'Remove'}
        </button>
      )}

      {isRefreshing && !mutationPending && <RefreshOverlay label="Updating cover" />}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
