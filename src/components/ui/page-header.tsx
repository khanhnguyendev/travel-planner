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
  subtitle?: string;
  className?: string;
}

export function PageHeader({ title, breadcrumbs, action, subtitle, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-2 flex-wrap" aria-label="Breadcrumb">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs transition-colors hover:text-teal-600"
            style={{ color: 'var(--color-text-subtle)' }}
          >
            <Home className="w-3 h-3" />
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" style={{ color: 'var(--color-border-strong)' }} />
              {crumb.href ? (
                <Link href={crumb.href} className="text-xs transition-colors hover:text-teal-600" style={{ color: 'var(--color-text-subtle)' }}>
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }} aria-current="page">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-subtle)' }}>{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0 mt-0.5">{action}</div>}
      </div>
    </div>
  );
}
