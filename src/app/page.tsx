import Link from 'next/link';
import { MapPin, Users, Receipt, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
          <span className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
            Travel Planner
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary text-sm"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
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
            className="text-5xl sm:text-6xl font-bold leading-tight mb-6"
            style={{ color: 'var(--color-text)' }}
          >
            Your group trip,{' '}
            <span style={{ color: 'var(--color-primary)' }}>planned together</span>
          </h1>

          <p
            className="text-xl leading-relaxed mb-10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Collect places from Google Maps, vote on favorites, and split expenses — all in one
            beautiful collaborative workspace. No more scattered spreadsheets.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 btn-primary text-base px-6 py-3"
            >
              Start planning
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="btn-secondary text-base px-6 py-3"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
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
