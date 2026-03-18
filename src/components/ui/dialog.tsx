'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({ title, onClose, children, maxWidth = 'max-w-md' }: DialogProps) {
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

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className={cn(
            `relative w-full ${maxWidth} glass-card overflow-hidden max-h-[95dvh] sm:max-h-[90dvh]`,
            'rounded-t-[2.5rem] sm:rounded-[2rem] border-white/20 shadow-premium',
            'animate-in slide-in-from-bottom-10 fade-in duration-500'
          )}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile drag handle */}
          <div className="flex justify-center pt-4 pb-2 sm:hidden">
            <div className="w-12 h-1.5 rounded-full bg-slate-200/50" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/50">
            <h2 className="font-display font-bold text-xl text-foreground">{title}</h2>
            <button 
              onClick={onClose} 
              className="p-2 rounded-xl hover:bg-slate-100 transition-all text-muted-foreground hover:text-foreground" 
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Scrollable body */}
          <div className="overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
