'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, X } from 'lucide-react';
import { createTrip, updateTrip } from '@/features/trips/actions';
import { useLoadingToast } from '@/components/ui/toast';

export default function ProjectCreateForm() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('VND');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const loadingToast = useLoadingToast();

  const CURRENCY_SYMBOLS: Record<string, string> = {
    VND: '₫', USD: '$', EUR: '€', GBP: '£', JPY: '¥', THB: '฿',
  };
  const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

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

    const parsedBudget = budget ? parseFloat(budget) : null;
    const result = await createTrip(
      title,
      description || undefined,
      visibility,
      startDate || null,
      endDate || null,
      parsedBudget && !isNaN(parsedBudget) ? parsedBudget : null,
      budgetCurrency
    );

    if (!result.ok) {
      resolve(result.error, 'error');
      setError(result.error);
      setPending(false);
      return;
    }

    const tripId = result.data.tripId;

    // Upload cover image if selected
    if (coverFile) {
      try {
        const res = await fetch('/api/uploads/cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, filename: coverFile.name, contentType: coverFile.type }),
        });
        const json = await res.json() as { ok: boolean; data?: { uploadUrl: string; coverPath: string } };
        if (json.ok && json.data) {
          await fetch(json.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': coverFile.type }, body: coverFile });
          const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${json.data.coverPath}`;
          await updateTrip(tripId, { cover_image_url: publicUrl });
        }
      } catch { /* non-fatal — trip is already created */ }
    }

    resolve('Trip created!', 'success');
    router.push(`/trips/${tripId}`);
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function clearCover() {
    setCoverFile(null);
    setCoverPreview(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
          Cover image{' '}
          <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>(optional)</span>
        </label>
        <div
          className="relative w-full h-36 rounded-2xl overflow-hidden cursor-pointer group border-2 border-dashed transition-colors"
          style={{
            borderColor: coverPreview ? 'transparent' : 'var(--color-border)',
            backgroundColor: coverPreview ? undefined : 'var(--color-bg-subtle)',
          }}
          onClick={() => coverInputRef.current?.click()}
        >
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Camera className="w-7 h-7" style={{ color: 'var(--color-text-subtle)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Click to add a cover photo</span>
            </div>
          )}
          {coverPreview && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">Change cover</span>
            </div>
          )}
        </div>
        {coverPreview && (
          <button type="button" onClick={clearCover} className="mt-2 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            <X className="w-3.5 h-3.5" /> Remove cover
          </button>
        )}
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { value: 'private', label: 'Private', desc: 'Only invited members can see this trip' },
            { value: 'public',  label: 'Public',  desc: 'Anyone can view; editing still requires a role' },
          ] as const).map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className="flex items-start gap-3 p-3.5 rounded-xl border text-left transition-colors"
              style={{
                borderColor: visibility === value ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: visibility === value ? 'var(--color-primary-light)' : 'white',
              }}
            >
              <span
                className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                style={{ borderColor: visibility === value ? 'var(--color-primary)' : 'var(--color-border)' }}
              >
                {visibility === value && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                )}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
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

      {/* Budget */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-text)' }}
        >
          Budget{' '}
          <span className="font-normal" style={{ color: 'var(--color-text-subtle)' }}>
            (optional)
          </span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
              style={{ color: 'var(--color-text-subtle)' }}
            >
              {CURRENCY_SYMBOLS[budgetCurrency] ?? budgetCurrency}
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm outline-none"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'white',
                color: 'var(--color-text)',
              }}
              placeholder="0.00"
            />
          </div>
          <select
            value={budgetCurrency}
            onChange={(e) => setBudgetCurrency(e.target.value)}
            className="px-3 py-2.5 rounded-xl border text-sm outline-none"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
