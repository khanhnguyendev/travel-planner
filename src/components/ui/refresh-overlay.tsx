'use client';

import { Loader2 } from 'lucide-react';

interface RefreshOverlayProps {
  label?: string;
}

export function RefreshOverlay({ label = 'Refreshing' }: RefreshOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-white/62 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-2 text-xs font-semibold shadow-sm" style={{ color: 'var(--color-text)' }}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </div>
    </div>
  );
}
