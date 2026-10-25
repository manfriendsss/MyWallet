import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  isBottomSheetOnMobile?: boolean;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  isBottomSheetOnMobile = true,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal / Bottom Sheet Content */}
          <motion.div
            initial={isBottomSheetOnMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={isBottomSheetOnMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'relative w-full z-10 bg-white dark:bg-[#121623] border-t sm:border border-neutral-200 dark:border-white/10 shadow-2xl',
              isBottomSheetOnMobile
                ? 'rounded-t-[28px] sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col'
                : 'rounded-2xl max-h-[85vh] flex flex-col',
              maxWidth
            )}
          >
            {/* Grabber handle on mobile */}
            {isBottomSheetOnMobile && (
              <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-white/5">
                <div>
                  {title && <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{title}</h3>}
                  {description && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{description}</p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto no-scrollbar flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
