import Link from 'next/link';
import { MapPin, Users, Receipt, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <span className="min-w-0 truncate font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
            Travel Planner
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Public trips
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary min-h-[40px] text-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20 sm:pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
            }}
          >
            <span>Plan trips together</span>
          </div>

          <h1
            className="mb-6 text-4xl font-bold leading-tight sm:text-6xl"
            style={{ color: 'var(--color-text)' }}
          >
            Your group trip,{' '}
            <span style={{ color: 'var(--color-primary)' }}>planned together</span>
          </h1>

          <p className="mb-10 text-base leading-relaxed sm:text-xl" style={{ color: 'var(--color-text-muted)' }}>
            Collect places from Google Maps, vote on favorites, and split expenses — all in one
            beautiful collaborative workspace. No more scattered spreadsheets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="btn-primary inline-flex min-h-[46px] items-center gap-2 px-5 py-3 text-sm sm:text-base"
            >
              Browse public trips
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="btn-secondary min-h-[46px] px-5 py-3 text-sm sm:text-base"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid gap-4 sm:mt-24 sm:gap-6 md:grid-cols-3">
          <div className="card p-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <MapPin className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
              Collect places
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Paste any Google Maps link and we&apos;ll pull in the name, address, rating, and
              reviews automatically.
            </p>
          </div>

          <div className="card p-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-secondary-light)' }}
            >
              <Users className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} />
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
              Decide together
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Everyone votes on destinations. Upvote, downvote, or give a score — see what the
              group really wants.
            </p>
          </div>

          <div className="card p-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-primary-light)' }}
            >
              <Receipt className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
            </div>
            <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--color-text)' }}>
              Track expenses
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Log shared expenses, split them fairly, and upload receipts — so no one loses track
              of who owes what.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
