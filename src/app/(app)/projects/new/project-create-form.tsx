'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/features/projects/actions';
import { useLoadingToast } from '@/components/ui/toast';

export default function ProjectCreateForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const loadingToast = useLoadingToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    if (startDate && endDate && endDate < startDate) {
      setError('End date must be on or after start date');
      setPending(false);
      return;
    }

    const resolve = loadingToast('Creating trip…');

    const result = await createProject(
      title,
      description || undefined,
      visibility,
      startDate || null,
      endDate || null
    );

    if (!result.ok) {
      resolve(result.error, 'error');
      setError(result.error);
      setPending(false);
      return;
    }

    resolve('Trip created!', 'success');
    router.push(`/projects/${result.data.projectId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Trip name <span style={{ color: 'var(--color-error)' }}>*</span>
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'white',
            color: 'var(--color-text)',
          }}
          placeholder="e.g. Tokyo Summer 2025"
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Description{' '}
          <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>
            (optional)
          </span>
        </label>
        <textarea
          id="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'white',
            color: 'var(--color-text)',
          }}
          placeholder="What's this trip about?"
          maxLength={500}
        />
      </div>

      {/* Visibility */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          Visibility
        </label>
        <div className="flex gap-3">
          {(['private', 'shared'] as const).map((v) => (
            <label
              key={v}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <input
                type="radio"
                name="visibility"
                value={v}
                checked={visibility === v}
                onChange={() => setVisibility(v)}
                className="accent-teal-600"
              />
              <span className="text-sm capitalize" style={{ color: 'var(--color-text)' }}>
                {v === 'private' ? 'Private (invite only)' : 'Shared (invite required)'}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
          Both options require an invite. &ldquo;Shared&rdquo; makes the project discoverable to
          invited members via link.
        </p>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Start date{' '}
            <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>
              (optional)
            </span>
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          />
        </div>
        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            End date{' '}
            <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>
              (optional)
            </span>
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          />
        </div>
      </div>

      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ color: 'var(--color-error)', backgroundColor: '#FEF2F2' }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary text-sm py-2.5 px-6 disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create trip'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary text-sm py-2.5 px-6"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
