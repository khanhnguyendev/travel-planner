import type { Category } from '@/lib/types';

interface CategoryBadgeProps {
  category: Pick<Category, 'name' | 'color' | 'icon'>;
  size?: 'sm' | 'md';
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const bg = category.color ?? '#E8E4DA';
  // Determine a readable text color: use dark text on light backgrounds.
  // We do a simple luminance estimate by checking the hex value.
  const isDark = isColorDark(bg);
  const textColor = isDark ? '#ffffff' : '#1C1917';

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1'
      : 'px-2.5 py-1 text-sm gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: bg, color: textColor }}
    >
      {category.icon && (
        <span className="leading-none" aria-hidden="true">
          {category.icon}
        </span>
      )}
      {category.name}
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
