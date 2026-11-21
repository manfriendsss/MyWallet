import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useDialog } from '../../utils/useDialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  isBottomSheetOnMobile?: boolean;
  maxWidth?: string;
  /** 'drawer': a bottom sheet on phones, a full-height panel sliding in from the right on wider screens */
  variant?: 'dialog' | 'drawer';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  isBottomSheetOnMobile = true,
  maxWidth = 'max-w-lg',
  variant = 'dialog',
}) => {
  const panelRef = useDialog(isOpen, onClose);
  const dismiss = () => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) active.blur();
    onClose();
  };
  const titleId = useId();
  const descId = useId();
  const [mobileViewport, setMobileViewport] = useState<{ height: number; offsetTop: number } | null>(null);
  const [isWide, setIsWide] = useState(() => window.matchMedia('(min-width: 640px)').matches);
  const isSideDrawer = variant === 'drawer' && isWide;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setIsWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // `dvh` is not updated consistently by every mobile browser while its
  // keyboard is open. Anchor the sheet to the visual viewport instead, so the
  // header stays reachable and the body becomes the only scrolling region.
  useEffect(() => {
    if (!isOpen) return;

    const viewport = window.visualViewport;
    const updateViewport = () => {
      if (!viewport || !window.matchMedia('(max-width: 639px)').matches) {
        setMobileViewport(null);
        return;
      }
      setMobileViewport({ height: Math.round(viewport.height), offsetTop: Math.round(viewport.offsetTop) });
    };

    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [isOpen]);

  const viewportOverlayStyle = mobileViewport
    ? { top: mobileViewport.offsetTop, bottom: 'auto', height: mobileViewport.height }
    : undefined;
  const panelStyle = mobileViewport ? { maxHeight: Math.max(0, mobileViewport.height - 12) } : undefined;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={cn(
            'fixed inset-0 z-[400] flex items-end justify-center overscroll-none',
            isSideDrawer ? 'sm:items-stretch sm:justify-end' : 'sm:items-center sm:p-4'
          )}
          style={viewportOverlayStyle}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={dismiss}
            aria-hidden="true"
            className="fixed inset-0 bg-scrim"
          />

          {/* Modal / Bottom Sheet Content */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={
              isSideDrawer
                ? { x: '100%', opacity: 0.6 }
                : isBottomSheetOnMobile ? { y: '100%', opacity: 0.6 } : { scale: 0.98, opacity: 0 }
            }
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={
              isSideDrawer
                ? { x: '100%', opacity: 0 }
                : isBottomSheetOnMobile ? { y: '100%', opacity: 0 } : { scale: 0.98, opacity: 0 }
            }
            transition={{ duration: isSideDrawer ? 0.32 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={panelStyle}
            className={cn(
              'relative w-full bg-surface shadow-[var(--shadow-overlay)] flex flex-col outline-none',
              isSideDrawer
                ? 'h-full max-h-none rounded-l-card'
                : cn('max-h-[92dvh] sm:max-h-[85dvh]', isBottomSheetOnMobile ? 'rounded-t-card sm:rounded-card' : 'rounded-card'),
              maxWidth
            )}
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-rule">
                <div className="min-w-0">
                  {title && (
                    <h2 id={titleId} className="text-lg text-ink">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="text-sm text-muted mt-1">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Đóng"
                  className="-mr-2 -mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="no-scrollbar flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
