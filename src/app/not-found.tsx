import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <MapPin className="w-12 h-12 mb-4" style={{ color: 'var(--color-primary)' }} />
      <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
        404
      </h1>
      <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)' }}>
        This page doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link href="/dashboard" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
