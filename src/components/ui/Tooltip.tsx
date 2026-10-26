import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom';
}

/**
 * Accessible tooltip bubble rendered in document.body.
 * Shows on 300ms mouse hover, keyboard focus-visible, or 500ms touch long press.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{
    x: number;
    y: number;
    actualSide: 'top' | 'bottom';
    arrowOffset: number;
  } | null>(null);

  const rawId = useId();
  const tooltipId = `tooltip-${rawId}`;

  const targetRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const touchTimerRef = useRef<number | null>(null);
  const isShownRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  const showTooltip = useCallback(() => {
    clearTimers();
    isShownRef.current = true;
    setIsOpen(true);
  }, [clearTimers]);

  const hideTooltip = useCallback(() => {
    clearTimers();
    isShownRef.current = false;
    setIsOpen(false);
  }, [clearTimers]);

  const updatePosition = useCallback(() => {
    if (!targetRef.current || !bubbleRef.current) return;
    const targetRect = targetRef.current.getBoundingClientRect();
    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    const gap = 8;
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let actualSide: 'top' | 'bottom' = side;
    if (side === 'top') {
      // Flip below if not enough room above and more room below
      if (targetRect.top - gap - bubbleRect.height < margin) {
        if (viewportHeight - targetRect.bottom - gap - bubbleRect.height >= margin) {
          actualSide = 'bottom';
        }
      }
    } else {
      // Flip above if not enough room below and more room above
      if (viewportHeight - targetRect.bottom - gap - bubbleRect.height < margin) {
        if (targetRect.top - gap - bubbleRect.height >= margin) {
          actualSide = 'top';
        }
      }
    }

    let y = actualSide === 'top' ? targetRect.top - gap - bubbleRect.height : targetRect.bottom + gap;
    y = Math.max(margin, Math.min(y, viewportHeight - bubbleRect.height - margin));

    const targetCenter = targetRect.left + targetRect.width / 2;
    const idealLeft = targetCenter - bubbleRect.width / 2;
    const maxLeft = Math.max(margin, viewportWidth - bubbleRect.width - margin);
    const x = Math.max(margin, Math.min(idealLeft, maxLeft));

    // Arrow stays centered on target even if the bubble is clamped to viewport
    const arrowOffset = Math.max(12, Math.min(targetCenter - x, bubbleRect.width - 12));

    setCoords({ x, y, actualSide, arrowOffset });
  }, [side]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setCoords(null);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    const handleScroll = () => {
      hideTooltip();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, hideTooltip]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      targetRef.current = node;

      const childProps = children.props as { ref?: React.Ref<unknown> };
      const childRef = childProps?.ref ?? (children as unknown as { ref?: React.Ref<unknown> }).ref;
      if (!childRef) return;

      if (typeof childRef === 'function') {
        childRef(node);
      } else if (typeof childRef === 'object' && childRef !== null && 'current' in childRef) {
        (childRef as React.MutableRefObject<unknown>).current = node;
      }
    },
    [children]
  );

  // Checked after every hook, so a tooltip whose text goes empty keeps the same hook order
  if (content === null || content === undefined || content === false || content === '') {
    return children;
  }

  const childProps = children.props as React.HTMLAttributes<HTMLElement>;
  const childDescribedBy = childProps['aria-describedby'];
  const ariaDescribedBy = isOpen ? [childDescribedBy, tooltipId].filter(Boolean).join(' ') : childDescribedBy;

  const trigger = React.cloneElement(children as React.ReactElement<any>, {
    ref: setRefs,
    'aria-describedby': ariaDescribedBy,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerEnter?.(e);
      if (e.pointerType === 'mouse') {
        clearTimers();
        showTimerRef.current = window.setTimeout(() => {
          showTooltip();
        }, 300);
      }
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerLeave?.(e);
      if (e.pointerType === 'mouse') {
        hideTooltip();
      }
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerDown?.(e);
      if (e.pointerType === 'touch') {
        clearTimers();
        touchTimerRef.current = window.setTimeout(() => {
          touchTimerRef.current = null;
          showTooltip();
        }, 500);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerUp?.(e);
      if (e.pointerType === 'touch') {
        if (touchTimerRef.current !== null) {
          window.clearTimeout(touchTimerRef.current);
          touchTimerRef.current = null;
        }
        if (isShownRef.current) {
          hideTimerRef.current = window.setTimeout(() => {
            hideTooltip();
          }, 1500);
        }
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerCancel?.(e);
      if (e.pointerType === 'touch') {
        hideTooltip();
      }
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(e);
      try {
        if (e.currentTarget.matches?.(':focus-visible')) {
          showTooltip();
        }
      } catch {
        // Fallback if matches is not supported
      }
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(e);
      hideTooltip();
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      childProps.onClick?.(e);
      hideTooltip();
    },
  });

  const effectiveSide = coords?.actualSide ?? side;
  // 4px translate toward the child: if bubble is on top, child is below (+y); if bottom, child is above (-y)
  const yOffset = effectiveSide === 'top' ? -4 : 4;

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={bubbleRef}
                id={tooltipId}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.96, y: yOffset }}
                animate={{ opacity: coords ? 1 : 0, scale: coords ? 1 : 0.96, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: yOffset }}
                transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: 'fixed',
                  left: coords?.x ?? -9999,
                  top: coords?.y ?? -9999,
                  zIndex: 'var(--z-tooltip)',
                  visibility: coords ? 'visible' : 'hidden',
                }}
                className="pointer-events-none max-w-[240px] rounded-control bg-tooltip px-2.5 py-1.5 text-xs font-medium text-tooltip-ink shadow-lg select-none"
              >
                {content}
                {coords && (
                  <span
                    aria-hidden="true"
                    className="absolute h-2 w-2 bg-tooltip pointer-events-none"
                    style={{
                      left: coords.arrowOffset,
                      ...(coords.actualSide === 'top'
                        ? { bottom: -4, transform: 'translateX(-50%) rotate(45deg)' }
                        : { top: -4, transform: 'translateX(-50%) rotate(45deg)' }),
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
