import Link from 'next/link';
import { MapPin, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { requireSession } from '@/features/auth/session';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/features/auth/actions';
import { ToastProvider } from '@/components/ui/toast';
import { MobileNav } from '@/components/ui/mobile-nav';
import { Avatar } from '@/components/ui/avatar';
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
    <div className="flex items-center gap-2 sm:gap-4">
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-sm font-bold text-foreground leading-none mb-1">
          {displayName}
        </span>
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          Pro Traveler
        </span>
      </div>
      
      <div className="relative group">
        <Avatar 
          user={{ display_name: displayName, avatar_url: profile?.avatar_url ?? null }} 
          size="md" 
          className="cursor-pointer group-hover:ring-primary/50 transition-all"
        />
        
        {/* Simple hover menu for desktop */}
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-premium border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 p-2">
          <Link href="/settings" className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <form action={async () => { 'use server'; await signOut(); }}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <ToastProvider>
      <div className="min-h-screen relative flex flex-col bg-background selection:bg-teal-100">
        {/* Top nav */}
        <header className="sticky top-0 z-40 glass-nav">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Left: logo + desktop nav */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
                <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                  <MapPin className="w-6 h-6" />
                </div>
                <span className="font-display font-bold text-lg tracking-tight text-foreground hidden sm:inline-block">
                  Travel Planner
                </span>
              </Link>

              {/* Desktop nav links */}
              <nav className="hidden md:flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/80 text-muted-foreground hover:text-foreground"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/trips"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:bg-white/80 text-muted-foreground hover:text-foreground"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Trips</span>
                </Link>
              </nav>
            </div>

            {/* Right: user menu */}
            <UserMenu userId={user.id} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 pb-32 md:pb-8">
          {children}
        </main>

        <MobileNav />
      </div>
    </ToastProvider>
  );
}
