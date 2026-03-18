import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  category: Pick<Category, 'name' | 'color' | 'icon'>;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const bg = category.color ?? '#E8E4DA';
  const isDark = isColorDark(bg);
  
  // Use a softer text color for light backgrounds
  const textColor = isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.8)';

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1 rounded-lg'
      : 'px-3 py-1.5 text-xs gap-1.5 rounded-xl';

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold uppercase tracking-widest transition-all shadow-sm border border-black/5 hover:scale-105",
        sizeClasses
      )}
      style={{ backgroundColor: bg, color: textColor }}
    >
      {category.icon && (
        <span className="text-sm leading-none filter drop-shadow-sm" aria-hidden="true">
          {category.icon}
        </span>
      )}
      <span className="font-display">{category.name}</span>
    </span>
  );
}

/** Rough luminance check so we can pick a contrasting text color. */
function isColorDark(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length < 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Perceived luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}
