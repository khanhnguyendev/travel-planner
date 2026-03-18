'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => string;
  dismissToast: (id: string) => void;
}

// -------------------------------------------------------
// Context
// -------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/** Convenience: show a loading toast, returns a replacer function */
export function useLoadingToast() {
  const { showToast, dismissToast } = useToast();
  return (message: string) => {
    const id = showToast(message, 'info');
    return (result: string, variant: ToastVariant = 'success') => {
      dismissToast(id);
      showToast(result, variant);
    };
  };
}

// -------------------------------------------------------
// Individual toast item
// -------------------------------------------------------

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000); // Slightly longer duration
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const variant = toast.variant ?? 'success';

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0 text-primary" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />,
    info: <Info className="w-5 h-5 flex-shrink-0 text-secondary" />,
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-5 py-4 glass-card shadow-premium border-white/20',
        'animate-in fade-in slide-in-from-top-4 duration-500',
        'min-w-[300px] max-w-sm rounded-2xl'
      )}
      role="alert"
      aria-live="polite"
    >
      {iconMap[variant]}
      <span className="flex-1 text-sm font-bold text-foreground">
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1.5 rounded-xl transition-all hover:bg-slate-100/50 text-muted-foreground hover:text-foreground flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// -------------------------------------------------------
// Provider
// -------------------------------------------------------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = 'success'): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast: dismiss }}>
      {children}
      {/* Fixed toast container — Top right for mobile reachability and avoiding bottom nav */}
      <div
        className="fixed top-6 right-4 left-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-3 items-center sm:items-end pointer-events-none"
        aria-label="Notifications"
      >
        <div className="flex flex-col gap-3 pointer-events-auto">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
