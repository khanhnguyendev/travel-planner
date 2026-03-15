export default function AuthLoading() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
      />
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Loading…
      </p>
    </div>
  );
}
