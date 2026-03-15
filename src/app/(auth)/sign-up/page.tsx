'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/features/auth/actions';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await signUp(email, password, displayName);

    if (!result.ok) {
      setError(result.error);
      setPending(false);
    }
    // On success, signUp redirects.
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
          Create an account
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Start planning your next trip
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-text)' }}
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
            placeholder="Your name"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-shadow"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'white',
              color: 'var(--color-text)',
            }}
            placeholder="At least 8 characters"
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
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium"
          style={{ color: 'var(--color-primary)' }}
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
