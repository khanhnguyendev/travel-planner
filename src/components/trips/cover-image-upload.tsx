'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, UploadCloud } from 'lucide-react';
import { updateTrip } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface CoverImageUploadProps {
  tripId: string;
  currentCoverUrl?: string | null;
}

export function CoverImageUpload({ tripId, currentCoverUrl }: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl ?? null);
  const loadingToast = useLoadingToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const resolve = loadingToast('Uploading cover masterpiece...');

    try {
      // 1. Get signed URL
      const res = await fetch('/api/uploads/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          filename: file.name,
          contentType: file.type,
        }),
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

      // 2. Upload to signed URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        resolve('Upload failed', 'error');
        return;
      }

      // 3. Build public URL and save to trip
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/covers/${coverPath}`;

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
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="relative group overflow-hidden rounded-[2rem] border border-slate-200/50 shadow-premium">
      {/* Cover strip */}
      <div
        className={cn(
          "w-full flex items-center justify-center cursor-pointer transition-all duration-700",
          previewUrl ? "h-48 sm:h-64" : "h-32 sm:h-40 bg-slate-50"
        )}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploading) inputRef.current?.click();
          }
        }}
        aria-label="Upload cover image"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Cover"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
             <UploadCloud className="w-8 h-8 text-primary/30" />
             <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">No Cover Image</span>
          </div>
        )}

        {/* Overlay */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 backdrop-blur-[2px]",
            previewUrl ? "bg-slate-900/40 opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100 bg-white/60",
            uploading && "opacity-100"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl glass-nav flex items-center justify-center text-white shadow-premium transition-transform duration-300 group-hover:scale-110 border border-white/20">
                <Camera className="w-6 h-6" />
              </div>
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/20 shadow-premium",
                previewUrl ? "text-white" : "text-slate-600 bg-white/80"
              )}>
                {previewUrl ? 'Change Masterpiece' : 'Set Cover'}
              </span>
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
