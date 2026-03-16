'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#FEF2F2' }}
      >
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        An unexpected error occurred. Please try again — if the problem persists, refresh the page.
      </p>
      <button
        onClick={reset}
        className="btn-primary text-sm inline-flex items-center gap-2"
      >
        Try again
      </button>
    </div>
  );
}
