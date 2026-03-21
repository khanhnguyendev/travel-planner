'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  PlusCircle,
  User2,
  LogOut,
  ChevronRight,
  Compass,
  UserCircle,
} from 'lucide-react';
import { signOut } from '@/features/auth/actions';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  displayName: string;
}

function NavItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition-all',
        active ? 'pill-tab-active' : 'pill-tab'
      )}
      style={{
        color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
      }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: active ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.48)' }}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

export function MobileNav({ displayName }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  const initial = displayName.trim().charAt(0).toUpperCase() || 'T';
  const isTripWorkspace = /^\/trips\/[^/]+$/.test(pathname);
  const tripsActive = pathname === '/dashboard' || pathname.startsWith('/trips/') || pathname.startsWith('/invites/');

  const dock = mounted && !isTripWorkspace
    ? createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] md:hidden">
          <div className="floating-dock pointer-events-auto rounded-[1.75rem] px-2 py-2">
            <div className="grid grid-cols-3 gap-2">
              <NavItem
                href="/dashboard"
                label="Trips"
                active={tripsActive}
                icon={<LayoutDashboard className="h-4 w-4" />}
              />
              <NavItem
                href="/trips/new"
                label="New"
                active={pathname === '/trips/new'}
                icon={<PlusCircle className="h-4 w-4" />}
              />
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="pill-tab flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold"
                style={{ color: 'var(--color-text-muted)' }}
                aria-expanded={open}
                aria-label="Open profile and app actions"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70">
                  <User2 className="h-4 w-4" />
                </span>
                You
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const drawer = mounted && open
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-50 bg-stone-950/35 backdrop-blur-sm md:hidden cursor-pointer"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden">
            <div className="section-shell rounded-[2rem] p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold text-white hero-orb">
                  {initial}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    {displayName}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-subtle)' }}>
                    Trip planning, ready to go
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-4 py-3 metric-tile"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        My trips
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Return to your active plans
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
                </Link>

                <Link
                  href="/trips/new"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-4 py-3 metric-tile"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                      <Compass className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Create a trip
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Start a new shared itinerary
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex min-h-[52px] items-center justify-between rounded-2xl px-4 py-3 metric-tile"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                      <UserCircle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Profile
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Edit your display name
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      await signOut();
                    });
                  }}
                  disabled={isPending}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-2xl px-4 py-3 metric-tile disabled:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <LogOut className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        {isPending ? 'Signing out...' : 'Sign out'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-subtle)' }}>
                        Leave this device safely
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" style={{ color: 'var(--color-text-subtle)' }} />
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <>
      <button
        className="md:hidden flex h-10 min-w-[44px] items-center justify-center rounded-full border px-3 shell-panel"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: 'linear-gradient(135deg, #0F766E 0%, #3558E6 100%)' }}>
          {initial}
        </span>
      </button>

      {dock}
      {drawer}
    </>
  );
}
