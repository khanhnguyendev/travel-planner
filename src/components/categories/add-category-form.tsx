'use client';

import { useState, useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import { createCategory } from '@/features/categories/actions';
import type { Category } from '@/lib/types';
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
  projectId: string;
  onCreated?: (category: Category) => void;
  onCancel?: () => void;
}

export function AddCategoryForm({
  projectId,
  onCreated,
  onCancel,
}: AddCategoryFormProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState('');
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
        projectId,
        name.trim(),
        color,
        icon.trim() || null
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        {/* Icon (emoji) input */}
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="✨"
          maxLength={4}
          className="w-12 text-center rounded-lg border px-2 py-2 text-base focus:outline-none focus:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-bg-subtle)',
            '--tw-ring-color': 'var(--color-primary)',
          } as React.CSSProperties}
          aria-label="Category emoji icon (optional)"
        />

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Category name"
          maxLength={60}
          required
          className="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            '--tw-ring-color': 'var(--color-primary)',
          } as React.CSSProperties}
        />
      </div>

      {/* Color picker */}
      <div>
        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Badge color
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1"
              style={{
                backgroundColor: c,
                '--tw-ring-color': c,
                boxShadow:
                  color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
              } as React.CSSProperties}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary inline-flex items-center gap-1.5 text-sm"
        >
          <Plus className="w-4 h-4" />
          {isPending ? 'Adding…' : 'Add category'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
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
