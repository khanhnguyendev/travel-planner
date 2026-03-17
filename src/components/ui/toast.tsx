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
    }, 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const variant = toast.variant ?? 'success';

  const iconMap = {
    success: <CheckCircle className="w-4 h-4 flex-shrink-0 text-teal-600" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />,
    info: <Info className="w-4 h-4 flex-shrink-0 text-blue-500" />,
  };

  const bgMap = {
    success: 'bg-white border-teal-200',
    error: 'bg-white border-red-200',
    info: 'bg-white border-blue-200',
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border',
        'animate-in fade-in slide-in-from-bottom-2 duration-300',
        'min-w-[260px] max-w-sm',
        bgMap[variant]
      )}
      role="alert"
      aria-live="polite"
    >
      {iconMap[variant]}
      <span
        className="flex-1 text-sm font-medium"
        style={{ color: 'var(--color-text)' }}
      >
        {toast.message}
      </span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded-md transition-colors hover:bg-stone-100 flex-shrink-0"
        style={{ color: 'var(--color-text-subtle)' }}
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
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
      {/* Fixed toast container */}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
