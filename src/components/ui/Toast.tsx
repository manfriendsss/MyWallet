import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState extends ToastOptions {
  id: number;
  duration: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    setToast({ ...options, duration: options.duration ?? 5000, id: nextId.current });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const portal = createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[500] flex justify-center px-4 md:bottom-6">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex max-w-md items-center gap-4 rounded-card bg-ink px-4 py-3 text-sm text-paper shadow-[var(--shadow-overlay)]"
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                className="shrink-0 font-bold text-accent dark:text-accent-ink"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
