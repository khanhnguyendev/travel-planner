'use client';

import { useState, useTransition } from 'react';
import { Plus, X, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createCategory } from '@/features/categories/actions';
import type { Category, CategoryType } from '@/lib/types';
import { useLoadingToast } from '@/components/ui/toast';

const PRESET_COLORS = [
  '#0D9488', // teal
  '#F97316', // coral
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EAB308', // yellow
  '#3B82F6', // blue
  '#10B981', // emerald
  '#6B7280', // gray
];

interface AddCategoryFormProps {
  tripId: string;
  onCreated?: (category: Category) => void;
  onCancel?: () => void;
}

export function AddCategoryForm({
  tripId,
  onCreated,
  onCancel,
}: AddCategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('');
  const [categoryType, setCategoryType] = useState<CategoryType>('general');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const loadingToast = useLoadingToast();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    const resolve = loadingToast('Adding category…');

    startTransition(async () => {
      const result = await createCategory(
        tripId,
        name.trim(),
        color,
        icon.trim() || null,
        null,
        categoryType
      );

      if (!result.ok) {
        resolve(result.error, 'error');
        setError(result.error);
        return;
      }

      resolve('Category added!', 'success');
      setName('');
      setIcon('');
      setColor(PRESET_COLORS[0]);
      onCreated?.(result.data.category);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        {/* Icon (emoji) input */}
        <div className="relative group">
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="✨"
            maxLength={4}
            className="w-14 h-12 text-center rounded-2xl border border-slate-200 bg-slate-50 text-xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner group-hover:bg-white"
            aria-label="Category emoji icon (optional)"
          />
        </div>

        {/* Name input */}
        <div className="flex-1 relative group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dream Stays"
            maxLength={60}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 h-12 text-sm font-bold bg-white focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-soft placeholder:text-slate-300 placeholder:font-normal"
          />
        </div>
      </div>

      {/* Color picker */}
      <div className="animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 ml-1">
          Pick a theme color
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                "w-8 h-8 rounded-full transition-all duration-300 transform hover:scale-125 focus:outline-none focus:ring-4 focus:ring-offset-2",
                color === c ? "ring-4 ring-offset-2 scale-110 shadow-lg" : "shadow-sm opacity-80 hover:opacity-100"
              )}
              style={{
                backgroundColor: c,
                '--tw-ring-color': c,
              } as React.CSSProperties}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
      </div>

      {/* Accommodation toggle */}
      <button
        type="button"
        onClick={() => setCategoryType((t) => t === 'accommodation' ? 'general' : 'accommodation')}
        className={cn(
          "group flex items-center gap-4 w-full p-4 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden",
          categoryType === 'accommodation' 
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-soft" 
            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
          categoryType === 'accommodation' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400 group-hover:bg-slate-300"
        )}>
          <BedDouble className="w-5 h-5" />
        </div>
        <div>
          <p className="font-display font-bold text-sm">Accommodation category</p>
          <p className="text-[10px] uppercase tracking-widest font-black opacity-40 mt-0.5">
            {categoryType === 'accommodation' ? 'Active • Specialized filters applied' : 'Inactive • Standard category'}
          </p>
        </div>
        {categoryType === 'accommodation' && (
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none" />
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-2xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <X className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="btn-premium flex-1 flex items-center justify-center gap-2 h-[52px] group disabled:grayscale disabled:opacity-50"
        >
          {isPending ? <Plus className="w-5 h-5 animate-spin text-white" /> : <Plus className="w-5 h-5 text-white transition-transform group-hover:rotate-90" />}
          <span className="font-display font-bold uppercase tracking-widest text-[13px] text-white">
            {isPending ? 'Adding Category...' : 'Create Category'}
          </span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-[52px] px-6 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-95"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
