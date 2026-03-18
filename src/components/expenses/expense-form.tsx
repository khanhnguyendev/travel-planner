'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SplitSquareVertical, Upload, X, Loader2, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { createExpense, type CreateExpenseInput, type SplitInput } from '@/features/expenses/actions';
import type { MemberWithProfile } from '@/features/members/queries';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLoadingToast } from '@/components/ui/toast';

// -------------------------------------------------------
// Constants
// -------------------------------------------------------

const CURRENCIES = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'THB'] as const;
type Currency = (typeof CURRENCIES)[number];

const EXPENSE_CATEGORIES = [
  { emoji: '🛏️', label: 'Accommodation' },
  { emoji: '🎤', label: 'Entertainment' },
  { emoji: '🛒', label: 'Groceries' },
  { emoji: '🦷', label: 'Healthcare' },
  { emoji: '🧯', label: 'Insurance' },
  { emoji: '🏠', label: 'Rent & Charges' },
  { emoji: '🍔', label: 'Restaurants & Bars' },
  { emoji: '🛍️', label: 'Shopping' },
  { emoji: '🚕', label: 'Transport' },
  { emoji: '🤚', label: 'Other' },
] as const;

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface SplitRow {
  userId: string;
  amountOwed: string; // raw string for controlled input
}

interface ExpenseFormProps {
  tripId: string;
  members: MemberWithProfile[];
  currentUserId: string;
  /** Called on successful save (dialog mode). Uses router if not provided. */
  onSuccess?: () => void;
  /** Called on cancel (dialog mode). Uses router.back() if not provided. */
  onCancel?: () => void;
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function parseAmount(raw: string): number {
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildDefaultSplits(members: MemberWithProfile[]): SplitRow[] {
  return members.map((m) => ({
    userId: m.user_id,
    amountOwed: '',
  }));
}

// -------------------------------------------------------
// Sub-components
// -------------------------------------------------------

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1"
    >
      {children}
    </label>
  );
}

function InputField({
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  min,
  step,
  className,
}: {
  id?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
  className?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
      className={cn(
        'w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all shadow-soft',
        'focus:ring-4 focus:ring-primary/5 focus:border-primary bg-white text-foreground placeholder:text-slate-400',
        className
      )}
    />
  );
}

// -------------------------------------------------------
// Main component
// -------------------------------------------------------

export function ExpenseForm({ tripId, members, currentUserId, onSuccess, onCancel }: ExpenseFormProps) {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('VND');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState('');
  const [paidByUserId, setPaidByUserId] = useState(currentUserId);

  // Splits
  const [splits, setSplits] = useState<SplitRow[]>(buildDefaultSplits(members));

  // Receipt upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [uploadedReceiptPath, setUploadedReceiptPath] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingToast = useLoadingToast();

  // -------------------------------------------------------
  // Computed values
  // -------------------------------------------------------

  const totalAmount = parseAmount(amount);
  const splitsTotal = splits.reduce((s, r) => s + parseAmount(r.amountOwed), 0);
  const diff = roundTo2(Math.abs(roundTo2(splitsTotal) - roundTo2(totalAmount)));
  const splitsValid = totalAmount > 0 && diff <= 0.01;

  // -------------------------------------------------------
  // Split helpers
  // -------------------------------------------------------

  function splitEqually() {
    if (totalAmount <= 0 || splits.length === 0) return;
    const perPerson = roundTo2(totalAmount / splits.length);
    // Distribute rounding remainder to first split
    const remainder = roundTo2(totalAmount - perPerson * splits.length);
    setSplits((prev) =>
      prev.map((row, i) => ({
        ...row,
        amountOwed:
          i === 0
            ? String(roundTo2(perPerson + remainder))
            : String(perPerson),
      }))
    );
  }

  function updateSplitAmount(index: number, value: string) {
    setSplits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, amountOwed: value } : row))
    );
  }

  function addSplitRow() {
    // pick the first member not already in splits
    const existingIds = new Set(splits.map((s) => s.userId));
    const next = members.find((m) => !existingIds.has(m.user_id));
    if (!next) return;
    setSplits((prev) => [...prev, { userId: next.user_id, amountOwed: '' }]);
  }

  function removeSplitRow(index: number) {
    setSplits((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSplitUser(index: number, userId: string) {
    setSplits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, userId } : row))
    );
  }

  // -------------------------------------------------------
  // Receipt upload
  // -------------------------------------------------------

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) {
        setReceiptFile(null);
        setReceiptPreviewUrl(null);
        setUploadedReceiptPath(null);
        return;
      }

      setReceiptFile(file);

      // Local preview
      const objectUrl = URL.createObjectURL(file);
      setReceiptPreviewUrl(objectUrl);

      // Upload
      setIsUploading(true);
      setError(null);
      try {
        const res = await fetch('/api/uploads/receipt', {
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
          data?: { uploadUrl: string; receiptPath: string };
          error?: { message: string };
        };

        if (!json.ok || !json.data) {
          throw new Error(json.error?.message ?? 'Failed to get upload URL');
        }

        const { uploadUrl, receiptPath } = json.data;

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!putRes.ok) {
          throw new Error('Upload failed');
        }

        setUploadedReceiptPath(receiptPath);
      } catch (err) {
        setError((err as Error).message ?? 'Receipt upload failed');
        setReceiptFile(null);
        setReceiptPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    },
    [tripId]
  );

  function clearReceipt() {
    setReceiptFile(null);
    setReceiptPreviewUrl(null);
    setUploadedReceiptPath(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // -------------------------------------------------------
  // Submit
  // -------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (totalAmount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (splits.length === 0) {
      setError('Add at least one split.');
      return;
    }
    if (!splitsValid) {
      setError(
        `Splits must total ${formatCurrency(totalAmount, currency)} (currently ${formatCurrency(splitsTotal, currency)}).`
      );
      return;
    }
    if (isUploading) {
      setError('Please wait for the receipt upload to complete.');
      return;
    }

    const splitInputs: SplitInput[] = splits.map((r) => ({
      userId: r.userId,
      amountOwed: parseAmount(r.amountOwed),
    }));

    const input: CreateExpenseInput = {
      tripId,
      title: title.trim(),
      category: category ?? null,
      amount: totalAmount,
      currency,
      expenseDate: expenseDate ? new Date(expenseDate).toISOString() : null,
      note: note.trim() || null,
      paidByUserId,
      splits: splitInputs,
      receiptPath: uploadedReceiptPath ?? null,
    };

    setIsSubmitting(true);
    const resolve = loadingToast('Creating expense…');
    try {
      const result = await createExpense(input);
      if (result.ok) {
        resolve('Expense added!', 'success');
        if (onSuccess) { onSuccess(); } else { router.push(`/trips/${tripId}/expenses`); }
      } else {
        const msg = result.error ?? 'Failed to create expense';
        resolve(msg, 'error');
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <Label htmlFor="title">Title</Label>
        <InputField
          id="title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Lunch at the market"
          required
        />
      </div>

      {/* Category */}
      <div>
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map(({ emoji, label }) => {
            const selected = category === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setCategory(selected ? null : label)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all",
                  selected 
                    ? "bg-primary text-white border-primary shadow-premium" 
                    : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
                )}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount + Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount</Label>
          <InputField
            id="amount"
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            required
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <div className="relative">
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary shadow-soft text-foreground"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
               <SplitSquareVertical className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </div>
      </div>

      {/* Expense date */}
      <div>
        <Label htmlFor="expenseDate">Date</Label>
        <InputField
          id="expenseDate"
          type="date"
          value={expenseDate}
          onChange={setExpenseDate}
        />
      </div>

      {/* Paid by */}
      <div>
        <Label htmlFor="paidBy">Paid by</Label>
        <div className="relative">
          <select
            id="paidBy"
            value={paidByUserId}
            onChange={(e) => setPaidByUserId(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary shadow-soft text-foreground"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile.display_name ?? m.user_id}
                {m.user_id === currentUserId ? ' (you)' : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
             <Upload className="w-4 h-4 rotate-180" />
          </div>
        </div>
      </div>

      {/* Note */}
      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add some details..."
          rows={2}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none resize-none focus:ring-4 focus:ring-primary/5 focus:border-primary shadow-soft text-foreground placeholder:text-slate-400"
        />
      </div>

      {/* Splits */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Label>Splits</Label>
          <button
            type="button"
            onClick={splitEqually}
            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            Split equally
          </button>
        </div>

        <div className="space-y-2">
          {splits.map((row, i) => {
            const memberOptions = members.filter(
              (m) =>
                m.user_id === row.userId ||
                !splits.some((s, si) => si !== i && s.userId === m.user_id)
            );
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50 shadow-inner"
              >
                {/* Member select */}
                <select
                  value={row.userId}
                  onChange={(e) => updateSplitUser(i, e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none shadow-sm h-[40px]"
                >
                  {memberOptions.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.profile.display_name ?? m.user_id}
                    </option>
                  ))}
                </select>

                {/* Amount */}
                <div className="relative">
                  <input
                    type="number"
                    value={row.amountOwed}
                    onChange={(e) => updateSplitAmount(i, e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-24 sm:w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm font-display font-bold outline-none text-right shadow-sm bg-white h-[40px]"
                  />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 pointer-events-none">
                     {currency}
                  </div>
                </div>

                {/* Remove */}
                {splits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSplitRow(i)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-red-100"
                    style={{ color: 'var(--color-text-subtle)' }}
                    title="Remove split"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add split row */}
        {splits.length < members.length && (
          <button
            type="button"
            onClick={addSplitRow}
            className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl bg-white text-muted-foreground border border-slate-200 hover:border-primary hover:text-primary transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add member
          </button>
        )}

        {/* Splits validation hint */}
        {totalAmount > 0 && (
          <div className={cn(
              "mt-4 flex items-center gap-3 px-4 py-3 rounded-2xl border text-[11px] font-bold uppercase tracking-wider transition-all",
              splitsValid 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-amber-50 text-amber-600 border-amber-100"
            )}
          >
            {splitsValid ? <ShieldCheck className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
            {splitsValid
              ? `Ready to go — balance: ${formatCurrency(splitsTotal, currency)}`
              : `Current total: ${formatCurrency(splitsTotal, currency)} — missing: ${formatCurrency(totalAmount - splitsTotal, currency)}`}
          </div>
        )}
      </div>

      {/* Receipt upload */}
      <div>
        <Label>Receipt (optional)</Label>
        {receiptPreviewUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={receiptPreviewUrl}
              alt="Receipt preview"
              className="w-full max-w-[160px] h-40 object-cover rounded-2xl border"
              style={{ borderColor: 'var(--color-border-muted)' }}
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
              </div>
            )}
            <button
              type="button"
              onClick={clearReceipt}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm"
              style={{ backgroundColor: 'var(--color-error)', color: 'white' }}
              title="Remove receipt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 w-full py-8 rounded-2xl border-2 border-dashed transition-colors',
              'hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/30'
            )}
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Upload className="w-6 h-6" style={{ color: 'var(--color-text-subtle)' }} />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Click to upload receipt
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
              JPG, PNG, HEIC, PDF up to 10 MB
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            void handleFileChange(file);
          }}
        />
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-8">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="btn-premium flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 h-[52px] px-8 disabled:opacity-50 disabled:grayscale"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          <span className="font-display font-bold uppercase tracking-widest text-[13px]">
            {isSubmitting ? 'Recording...' : 'Save shared cost'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="btn-secondary h-[52px] px-8 text-sm font-bold uppercase tracking-widest"
        >
          Never mind
        </button>
      </div>
    </form>
  );
}
