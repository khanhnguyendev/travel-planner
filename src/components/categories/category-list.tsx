'use client';

import type { Category } from '@/lib/types';
import { CategoryBadge } from './category-badge';

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  inline?: boolean;
}

export function CategoryList({
  categories,
  selectedId,
  onSelect,
  inline = false,
}: CategoryListProps) {
  return (
    <div className={inline ? 'flex items-center gap-2' : 'flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide'}>
      {/* "All" chip */}
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
        style={{
          backgroundColor:
            selectedId === null
              ? 'var(--color-primary)'
              : 'var(--color-bg-subtle)',
          color:
            selectedId === null
              ? 'var(--color-primary-foreground)'
              : 'var(--color-text-muted)',
        }}
      >
        All
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className="flex-shrink-0 transition-opacity"
          style={{
            opacity: selectedId !== null && selectedId !== cat.id ? 0.55 : 1,
          }}
        >
          <CategoryBadge
            category={cat}
            size="md"
          />
        </button>
      ))}
    </div>
  );
}
