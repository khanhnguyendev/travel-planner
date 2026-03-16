import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, breadcrumbs, action, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-2 flex-wrap" aria-label="Breadcrumb">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm transition-colors hover:text-teal-600"
            style={{ color: 'var(--color-text-subtle)' }}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-subtle)' }} />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-sm transition-colors hover:text-teal-600"
                  style={{ color: 'var(--color-text-subtle)' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-center justify-between gap-4">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h1>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
