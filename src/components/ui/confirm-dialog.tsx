'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Dialog } from './dialog';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  okText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info';
  showCancel?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: Omit<ConfirmOptions, 'showCancel' | 'cancelText'>) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({ ...opts, showCancel: opts.showCancel ?? true });
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const alert = useCallback((opts: Omit<ConfirmOptions, 'showCancel' | 'cancelText'>) => {
    setOptions({ ...opts, showCancel: false });
    return new Promise<void>((resolve) => {
      setResolver(() => (v: boolean) => resolve());
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolver) resolver(false);
    setOptions(null);
    setResolver(null);
  }, [resolver]);

  const handleConfirm = useCallback(() => {
    if (resolver) resolver(true);
    setOptions(null);
    setResolver(null);
  }, [resolver]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {options && (
        <Dialog title={options.title} onClose={handleClose} maxWidth="max-w-[380px]">
          <div className="flex flex-col items-center text-center">
            <div className={cn(
              "mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
              options.variant === 'danger' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
            )}>
              {options.variant === 'danger' ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <Info className="h-6 w-6" />
              )}
            </div>
            
            <p className="mb-6 text-sm leading-relaxed text-stone-600">
              {options.message}
            </p>

            <div className="flex w-full gap-3">
              {(options.showCancel !== false) && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-sm font-semibold text-stone-600 transition-all hover:bg-stone-50 active:scale-95"
                >
                  {options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-95 shadow-md",
                  options.variant === 'danger' 
                    ? "bg-red-500 hover:bg-red-600 shadow-red-200" 
                    : "bg-stone-900 hover:bg-black shadow-stone-200"
                )}
              >
                {options.okText || 'Confirm'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
