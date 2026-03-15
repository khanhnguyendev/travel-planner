'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/features/auth/actions';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await signIn(email, password);

    if (!result.ok) {
      setError(result.error);
      setPending(false);
    }
    // On success, signIn redirects — no need to handle the ok case here.
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          Welcome back
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Sign in to continue planning
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p
            className="text-sm rounded-lg px-3 py-2"
            style={{
              color: 'var(--color-error)',
              backgroundColor: '#FEF2F2',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full btn-primary py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/sign-up"
          className="font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
