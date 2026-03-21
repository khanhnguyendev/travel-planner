import Link from 'next/link';
import { Compass, LogOut, LayoutDashboard } from 'lucide-react';
import { getSession } from '@/features/auth/session';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/features/auth/actions';
import { ToastProvider } from '@/components/ui/toast';
import { MobileNav } from '@/components/ui/mobile-nav';
import { Avatar } from '@/components/ui/avatar';
import { NavClock } from '@/components/ui/nav-clock';
import type { Profile } from '@/lib/types';
import { cn } from '@/lib/utils';

async function UserMenu({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const profile = profileData as Profile | null;
  const displayName = profile?.display_name ?? 'Traveler';

  return (
    <>
      {/* Desktop user menu */}
      <div className="hidden md:flex items-center gap-2">
        <Link href="/profile" className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-colors hover:bg-white/70" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
          <Avatar user={{ display_name: displayName, avatar_url: profile?.avatar_url ?? null }} size="sm" />
          <span className="text-sm font-medium max-w-[120px] truncate" style={{ color: 'var(--color-text)' }}>
            {displayName}
          </span>
        </Link>
        <form action={async () => { 'use server'; await signOut(); }}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-500 min-h-[36px] cursor-pointer"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-subtle)' }}
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </div>

      {/* Mobile hamburger */}
      <MobileNav displayName={displayName} />
    </>
  );
}

import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="app-shell-bg min-h-screen overflow-x-hidden">
          <header className="sticky top-0 z-40 border-b glass" style={{ borderColor: 'rgba(255,255,255,0.65)' }}>
            <div
              className={cn(
                'mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6',
                user && 'md:grid md:grid-cols-[1fr_auto_1fr]'
              )}
            >
              <div className="flex items-center gap-6">
                <Link href={user ? '/dashboard' : '/'} className="group flex shrink-0 items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl transition-transform group-hover:scale-105 hero-orb"
                  >
                    <Compass className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--color-text-subtle)' }}>
                      Group travel
                    </p>
                    <span className="block font-semibold tracking-tight text-sm sm:text-base section-title" style={{ color: 'var(--color-text)' }}>
                      Travel Planner
                    </span>
                  </div>
                </Link>

                {user && (
                  <nav className="hidden items-center gap-1 md:flex">
                    <Link
                      href="/dashboard"
                      className="pill-tab pill-tab-active flex min-h-[40px] items-center gap-2 px-4 py-2 text-sm font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      My Trips
                    </Link>
                  </nav>
                )}
              </div>

              {user ? (
                <div className="hidden md:flex justify-center">
                  <div className="shell-panel rounded-full px-4 py-2">
                    <NavClock />
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end">
                {user ? (
                  <UserMenu userId={user.id} />
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/"
                      className="hidden min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-white/70 sm:inline-flex"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      Home
                    </Link>
                    <Link href="/sign-in" className="btn-primary min-h-[42px] text-sm">
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-10">
            {children}
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
