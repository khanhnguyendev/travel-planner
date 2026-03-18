'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MapPin, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'My Trips',
      href: '/trips',
      icon: MapPin,
      active: pathname.startsWith('/trips'),
    },
    {
      label: 'Explore',
      href: '#',
      icon: Search,
      active: false,
    },
    {
      label: 'Profile',
      href: '#',
      icon: User,
      active: false,
    },
  ];

  return (
    <nav className="fixed bottom-6 left-6 right-6 z-50 md:hidden glass-nav rounded-2xl px-2 py-2 flex items-center justify-around shadow-premium border border-white/20">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300',
            item.active 
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <item.icon className={cn(
            "w-5 h-5 transition-transform duration-300",
            item.active && "scale-110"
          )} />
          <span className="text-[10px] font-semibold tracking-wide uppercase">
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
