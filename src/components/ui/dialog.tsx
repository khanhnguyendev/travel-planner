'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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
      <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 sm:pt-16">
        <div
          className={`relative w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden max-h-[95dvh] sm:max-h-[92dvh]`}
          style={{ backgroundColor: 'var(--color-bg)' }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-stone-200" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="font-semibold text-base text-stone-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Close">
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          {/* Scrollable body */}
          <div className="overflow-y-auto p-5">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
