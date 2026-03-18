'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { updateTrip } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';

interface CoverImageUploadProps {
  tripId: string;
  currentCoverUrl?: string | null;
  height?: number;
}

export function CoverImageUpload({
  tripId,
  currentCoverUrl,
  height = 200,
}: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl ?? null);
  const loadingToast = useLoadingToast();

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

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${coverPath}`;
      const result = await updateTrip(tripId, { cover_image_url: publicUrl });

      if (result.ok) {
        setPreviewUrl(publicUrl);
        resolve('Cover image updated!', 'success');
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
        resolve('Cover image removed', 'success');
      } else {
        resolve(result.error ?? 'Failed to remove cover image', 'error');
      }
    } catch {
      resolve('Failed to remove cover image', 'error');
    } finally {
      setRemoving(false);
    }
  }

  const busy = uploading || removing;

  return (
    <div className="relative">
      <div
        className="w-full flex items-center justify-center cursor-pointer group"
        style={{ height, backgroundColor: previewUrl ? undefined : 'var(--color-bg-subtle)' }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!busy) inputRef.current?.click(); }
        }}
        aria-label="Upload cover image"
      >
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Cover" className="w-full h-full object-cover" />
        )}

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-opacity"
          style={{ backgroundColor: previewUrl ? 'rgba(0,0,0,0.35)' : 'transparent', opacity: busy ? 1 : undefined }}
        >
          {busy ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <div
              className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: previewUrl ? undefined : 1 }}
            >
              <Camera className="w-8 h-8" style={{ color: previewUrl ? 'white' : 'var(--color-text-subtle)' }} />
              <span className="text-sm font-medium" style={{ color: previewUrl ? 'white' : 'var(--color-text-muted)' }}>
                {previewUrl ? 'Change cover' : 'Add cover image'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Remove button — only shown when a cover exists */}
      {previewUrl && !busy && (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-red-600 opacity-0 group-hover:opacity-100"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}
          aria-label="Remove cover image"
        >
          <X className="w-3.5 h-3.5" />
          Remove
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  );
}
