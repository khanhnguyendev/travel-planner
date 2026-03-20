'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({ title, onClose, children, maxWidth = 'max-w-md' }: DialogProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm cursor-pointer" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-x-hidden px-2 py-3 sm:p-4 sm:pt-16">
        <div
          className={cn(
            'relative mx-auto flex min-w-0 w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[1.5rem] max-h-[88dvh] overflow-x-hidden sm:max-h-[92dvh]',
            maxWidth
          )}
          style={{ backgroundColor: 'var(--color-bg)' }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3.5 sm:px-5 sm:py-4" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold text-base text-stone-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Close">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          {/* Scrollable body */}
          <div className="min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
