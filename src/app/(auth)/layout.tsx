import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <MapPin className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
        <span className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
          Travel Planner
        </span>
      </Link>

      {/* Card */}
      <div className="card w-full max-w-md p-8">
        {children}
      </div>
    </div>
  );
}
