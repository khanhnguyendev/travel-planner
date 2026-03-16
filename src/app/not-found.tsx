import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
      >
        <Compass className="w-10 h-10" style={{ color: 'var(--color-primary)' }} />
      </div>
      <h1 className="text-5xl font-bold mb-3" style={{ color: 'var(--color-text)' }}>
        404
      </h1>
      <p className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Lost in transit
      </p>
      <p className="text-base mb-8 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 min-h-[44px]">
        <Compass className="w-4 h-4" />
        Back to dashboard
      </Link>
    </div>
  );
}
