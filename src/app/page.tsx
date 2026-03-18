import Link from 'next/link';
import { MapPin, Users, Receipt, ArrowRight, Sparkles, Globe, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen selection:bg-teal-100 selection:text-teal-900">
      {/* Background Gradient Orbs */}
      <div className="fixed inset-0 overflow-hidden -z-10 bg-background">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 px-6 py-4 glass-nav">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              Travel Planner
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn-premium text-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-primary text-xs font-semibold mb-8 animate-fade-in-up border border-primary/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Trip Collaboration</span>
          </div>

          <h1 className="text-6xl sm:text-7xl font-display font-extrabold leading-[1.1] mb-8 animate-fade-in-up [animation-delay:200ms] text-foreground">
            Plan your group trip,{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">effortlessly</span>
          </h1>

          <p className="text-xl leading-relaxed mb-12 text-muted-foreground max-w-2xl mx-auto animate-fade-in-up [animation-delay:400ms]">
            Collect places from Google Maps, vote on favorites, and split expenses — all in one 
            beautiful collaborative workspace designed for modern travelers.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up [animation-delay:600ms]">
            <Link
              href="/sign-up"
              className="btn-premium text-base px-8 py-4 w-full sm:w-auto"
            >
              Start planning now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-4 rounded-xl font-medium text-foreground hover:bg-white/50 transition-all border border-transparent hover:border-slate-200 w-full sm:w-auto text-center"
            >
              View demo
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 animate-fade-in-up [animation-delay:800ms]">
          <div className="card-premium p-8 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-500">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3 text-foreground">
              Intelligent Collection
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Paste any Google Maps link and we&apos;ll instantly pull in the name, address, 
              rating, and reviews for the whole group to see.
            </p>
          </div>

          <div className="card-premium p-8 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-secondary/10 text-secondary group-hover:scale-110 transition-transform duration-500">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3 text-foreground">
              Democratic Voting
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Eliminate the back-and-forth. Everyone votes on their top picks, and we 
              visualize the group favorites automatically.
            </p>
          </div>

          <div className="card-premium p-8 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-accent/10 text-accent group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-display font-bold mb-3 text-foreground">
              Expense Transparency
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Log shared costs, split bills fairly, and upload receipts in real-time. 
              No more awkward money conversations later.
            </p>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="py-12 border-t border-slate-200/50 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Travel Planner. Built for modern explorers.
        </p>
      </footer>
    </div>
  );
}
