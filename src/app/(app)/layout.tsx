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
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
          <Avatar user={{ display_name: displayName, avatar_url: profile?.avatar_url ?? null }} size="sm" />
          <span className="text-sm font-medium max-w-[120px] truncate" style={{ color: 'var(--color-text)' }}>
            {displayName}
          </span>
        </div>
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

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <ToastProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

        {/* Top nav — glassmorphism */}
        <header className="sticky top-0 z-40 glass border-b" style={{ borderColor: 'rgba(229,231,235,0.6)' }}>
          <div
            className={cn(
              'max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4',
              user && 'md:grid md:grid-cols-[1fr_auto_1fr]'
            )}
          >

            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 shrink-0 group">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)' }}
                >
                  <Compass className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--color-text)' }}>
                  Travel Planner
                </span>
              </Link>

              {/* Desktop nav */}
              {user && (
                <nav className="hidden md:flex items-center gap-0.5">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/70 min-h-[36px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    My Trips
                  </Link>
                </nav>
              )}
            </div>

            {/* Center clock */}
            {user ? <NavClock /> : null}

            {/* User menu */}
            <div className="flex justify-end">
              {user ? (
                <UserMenu userId={user.id} />
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/70"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Home
                  </Link>
                  <Link href="/sign-in" className="btn-primary text-sm min-h-[40px]">
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
