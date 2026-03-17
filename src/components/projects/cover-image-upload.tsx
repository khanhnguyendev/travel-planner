'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { updateProject } from '@/features/projects/actions';
import { useLoadingToast } from '@/components/ui/toast';

interface CoverImageUploadProps {
  projectId: string;
  currentCoverUrl?: string | null;
}

export function CoverImageUpload({ projectId, currentCoverUrl }: CoverImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl ?? null);
  const loadingToast = useLoadingToast();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const resolve = loadingToast('Uploading cover image…');

    try {
      // 1. Get signed URL
      const res = await fetch('/api/uploads/cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
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

      // 3. Build public URL and save to project
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/covers/${coverPath}`;

      const result = await updateProject(projectId, { cover_image_url: publicUrl });

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
    <div className="relative">
      {/* Cover strip */}
      <div
        className="w-full flex items-center justify-center cursor-pointer group"
        style={{ height: 200, backgroundColor: previewUrl ? undefined : 'var(--color-bg-subtle)' }}
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
            className="w-full h-full object-cover"
          />
        ) : null}

        {/* Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-opacity"
          style={{
            backgroundColor: previewUrl
              ? 'rgba(0,0,0,0.35)'
              : 'transparent',
            opacity: uploading ? 1 : undefined,
          }}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          ) : (
            <div
              className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: previewUrl ? undefined : 1 }}
            >
              <Camera
                className="w-8 h-8"
                style={{ color: previewUrl ? 'white' : 'var(--color-text-subtle)' }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: previewUrl ? 'white' : 'var(--color-text-muted)' }}
              >
                {previewUrl ? 'Change cover' : 'Add cover image'}
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
