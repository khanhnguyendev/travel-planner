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
    <div className={inline ? 'flex flex-nowrap items-center gap-2' : 'flex flex-wrap items-center gap-2 pb-1 sm:flex-nowrap sm:overflow-x-auto sm:scrollbar-hide'}>
      {/* "All" chip */}
      <button
        onClick={() => onSelect(null)}
        className="flex-shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm"
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
