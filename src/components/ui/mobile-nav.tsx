'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  displayName: string;
}

export function MobileNav({ displayName }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  // Close on route change / escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        className={cn(
          'md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
          'hover:bg-stone-100'
        )}
        style={{ color: 'var(--color-text-muted)' }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={cn(
          'fixed top-14 left-0 right-0 z-50 bg-white border-b shadow-lg md:hidden',
          'transition-all duration-200',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
        style={{ borderColor: 'var(--color-border)' }}
        aria-label="Mobile navigation"
      >
        <div className="px-4 py-4 space-y-1">
          {/* Avatar + name */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
              {displayName}
            </span>
          </div>

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
              'min-h-[44px]'
            )}
            style={{ color: 'var(--color-text-muted)' }}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
        </div>
      </nav>
    </>
  );
}
