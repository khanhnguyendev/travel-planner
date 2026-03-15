'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
        Something went wrong
      </h2>
      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <button onClick={reset} className="btn-primary text-sm">
        Try again
      </button>
    </div>
  );
}
