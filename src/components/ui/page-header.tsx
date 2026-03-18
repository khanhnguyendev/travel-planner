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
    <div className={cn('mb-8 animate-fade-in-up', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-3 flex-wrap" aria-label="Breadcrumb">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-primary text-muted-foreground"
          >
            <Home className="w-3 h-3" />
            <span className="sr-only">Home</span>
          </Link>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-primary text-muted-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className="text-[11px] font-bold uppercase tracking-wider text-foreground"
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
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
          {title}
        </h1>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
