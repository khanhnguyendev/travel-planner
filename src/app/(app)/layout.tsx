import Link from 'next/link';
import { MapPin, LayoutDashboard, LogOut } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/features/auth/actions';
import type { Profile } from '@/lib/types';

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
    <div className="flex items-center gap-3">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--color-text)' }}>
        {displayName}
      </span>
      <form action={async () => { await signOut(); }}>
        <button
          type="submit"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-muted)',
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Top nav */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'white',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <MapPin className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
              <span className="font-semibold text-base hidden sm:block" style={{ color: 'var(--color-text)' }}>
                Travel Planner
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            </nav>
          </div>

          {/* Right: user menu */}
          <UserMenu userId={user.id} />
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
