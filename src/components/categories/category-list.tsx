'use client';

import type { Category } from '@/lib/types';
import { CategoryBadge } from './category-badge';
import { cn } from '@/lib/utils';

interface CategoryListProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryList({
  categories,
  selectedId,
  onSelect,
}: CategoryListProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
      {/* "All" chip */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex-shrink-0 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-soft border",
          selectedId === null
            ? "bg-primary text-white border-primary shadow-premium scale-105"
            : "bg-white text-slate-500 border-slate-100 hover:border-primary/30 hover:text-primary"
        )}
      >
        <span className="font-display">All</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "flex-shrink-0 transition-all duration-300",
            selectedId !== null && selectedId !== cat.id ? "opacity-40 grayscale-[0.5] scale-95" : "scale-100"
          )}
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
