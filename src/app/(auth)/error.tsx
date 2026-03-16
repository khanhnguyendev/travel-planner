'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AuthError]', error);
  }, [error]);

  return (
    <div className="text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: '#FEF2F2' }}
      >
        <ShieldAlert className="w-6 h-6 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Authentication error
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
        We couldn&apos;t complete the sign-in. Please try again.
      </p>
      <div className="flex flex-col gap-2 items-center">
        <button
          onClick={reset}
          className="btn-primary text-sm"
        >
          Try again
        </button>
        <Link
          href="/sign-in"
          className="text-sm transition-colors hover:underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
