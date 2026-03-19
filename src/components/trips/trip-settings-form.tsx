'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Lock, AlertTriangle } from 'lucide-react';
import { updateTrip, updateTripDates, archiveTrip } from '@/features/trips/actions';
import { CoverImageUpload } from '@/components/trips/cover-image-upload';
import { useToast } from '@/components/ui/toast';
import type { Trip } from '@/lib/types';

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'];

interface TripSettingsFormProps {
  trip: Trip;
  isOwner: boolean;
}

// -------------------------------------------------------
// Section wrapper
// -------------------------------------------------------

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-5 border-b pb-4" style={{ borderColor: 'var(--color-border-muted)' }}>
        <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>{title}</h2>
        {description && <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-subtle)' }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

// -------------------------------------------------------
// Field row
// -------------------------------------------------------

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
      <div className="w-full sm:w-40 flex-shrink-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        {hint && <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>{hint}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// -------------------------------------------------------
// GeneralSection
// -------------------------------------------------------

function GeneralSection({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [title, setTitle] = useState(trip.title);
  const [description, setDescription] = useState(trip.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError(null);
    const result = await updateTrip(trip.id, {
      title: title.trim(),
      description: description.trim() || null,
    });
    setSaving(false);
    if (result.ok) {
      showToast('Trip updated', 'success');
      startRefreshTransition(() => router.refresh());
    } else {
      setError(result.error ?? 'Failed to save');
    }
  }

  return (
    <Section title="General" description="Trip name and description shown to all members.">
      <div className="space-y-5">
        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
          />
        </Field>
        <Field label="Description" hint="Optional — shown in the trip hero.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
            placeholder="A short description of this trip…"
          />
          <p className="mt-1 text-right text-[11px]" style={{ color: 'var(--color-text-subtle)' }}>
            {description.length}/500
          </p>
        </Field>
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isRefreshing}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Section>
  );
}

// -------------------------------------------------------
// AppearanceSection
// -------------------------------------------------------

function AppearanceSection({ trip }: { trip: Trip }) {
  return (
    <Section title="Appearance" description="Cover photo shown in the trip hero banner.">
      <Field label="Cover image" hint="Recommended: 1200×400px or wider.">
        <div className="h-40 w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
          <CoverImageUpload
            tripId={trip.id}
            currentCoverUrl={trip.cover_image_url}
            height={160}
            variant="panel"
          />
        </div>
      </Field>
    </Section>
  );
}

// -------------------------------------------------------
// DatesSection
// -------------------------------------------------------

function DatesSection({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [startDate, setStartDate] = useState(trip.start_date ?? '');
  const [endDate, setEndDate] = useState(trip.end_date ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (startDate && endDate && endDate < startDate) {
      setError('End date must be after start date');
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateTripDates(trip.id, startDate || null, endDate || null);
    setSaving(false);
    if (result.ok) {
      showToast('Dates updated', 'success');
      startRefreshTransition(() => router.refresh());
    } else {
      setError(result.error ?? 'Failed to save');
    }
  }

  return (
    <Section title="Dates" description="Planning window for this trip.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
            />
          </Field>
        </div>
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isRefreshing}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save dates'}
          </button>
        </div>
      </div>
    </Section>
  );
}

// -------------------------------------------------------
// VisibilitySection
// -------------------------------------------------------

function VisibilitySection({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [visibility, setVisibility] = useState<'private' | 'public'>(trip.visibility);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (visibility === trip.visibility) return;
    setSaving(true);
    const result = await updateTrip(trip.id, { visibility });
    setSaving(false);
    if (result.ok) {
      showToast(visibility === 'public' ? 'Trip is now public' : 'Trip is now private', 'success');
      startRefreshTransition(() => router.refresh());
    }
  }

  const options: { value: 'private' | 'public'; icon: React.ReactNode; label: string; desc: string }[] = [
    {
      value: 'private',
      icon: <Lock className="h-5 w-5" />,
      label: 'Private',
      desc: 'Only invited members can view this trip.',
    },
    {
      value: 'public',
      icon: <Globe className="h-5 w-5" />,
      label: 'Public',
      desc: 'Anyone with the link can view places, map, and timeline — but not money or member-only content.',
    },
  ];

  return (
    <Section title="Visibility" description="Control who can see this trip.">
      <div className="space-y-3">
        {options.map((opt) => {
          const active = visibility === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVisibility(opt.value)}
              className="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all"
              style={{
                borderColor: active ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: active ? 'var(--color-primary-light)' : 'white',
              }}
            >
              <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-subtle)' }}>
                {opt.icon}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{opt.label}</p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>{opt.desc}</p>
              </div>
            </button>
          );
        })}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isRefreshing || visibility === trip.visibility}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save visibility'}
          </button>
        </div>
      </div>
    </Section>
  );
}

// -------------------------------------------------------
// MoneySection
// -------------------------------------------------------

function MoneySection({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [currency, setCurrency] = useState(trip.budget_currency || 'VND');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (currency === trip.budget_currency) return;
    setSaving(true);
    const result = await updateTrip(trip.id, { budget_currency: currency });
    setSaving(false);
    if (result.ok) {
      showToast('Currency updated', 'success');
      startRefreshTransition(() => router.refresh());
    }
  }

  return (
    <Section title="Money" description="Default currency used for expenses, budget, and contributions.">
      <div className="space-y-4">
        <Field label="Default currency" hint="Changing this affects how balances and income are displayed.">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'white', color: 'var(--color-text)' }}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || isRefreshing || currency === trip.budget_currency}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save currency'}
          </button>
        </div>
      </div>
    </Section>
  );
}

// -------------------------------------------------------
// DangerSection
// -------------------------------------------------------

function DangerSection({ trip, isOwner }: { trip: Trip; isOwner: boolean }) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  async function handleArchive() {
    if (!confirm('Archive this trip? It will be hidden from your active trips and become read-only.')) return;
    setArchiving(true);
    const result = await archiveTrip(trip.id);
    if (result.ok) {
      router.push('/dashboard');
    } else {
      alert(result.error ?? 'Failed to archive trip');
      setArchiving(false);
    }
  }

  if (!isOwner) return null;

  return (
    <div className="card border-red-200 p-5 sm:p-6" style={{ borderColor: '#FECACA' }}>
      <div className="mb-5 border-b border-red-100 pb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-red-700">
          <AlertTriangle className="h-4 w-4" />
          Danger zone
        </h2>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--color-text-subtle)' }}>
          These actions are permanent or hard to reverse.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Archive trip</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            Hides the trip from active view. All data is preserved and can be restored by contacting support.
          </p>
        </div>
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving || trip.status === 'archived'}
          className="flex-shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          {archiving ? 'Archiving…' : trip.status === 'archived' ? 'Already archived' : 'Archive trip'}
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// TripSettingsForm
// -------------------------------------------------------

export function TripSettingsForm({ trip, isOwner }: TripSettingsFormProps) {
  return (
    <div className="space-y-5">
      <GeneralSection trip={trip} />
      <AppearanceSection trip={trip} />
      <DatesSection trip={trip} />
      <VisibilitySection trip={trip} />
      <MoneySection trip={trip} />
      <DangerSection trip={trip} isOwner={isOwner} />
    </div>
  );
}
