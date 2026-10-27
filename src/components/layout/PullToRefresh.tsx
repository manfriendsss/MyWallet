import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

const THRESHOLD = 56;
const MAX_PULL = 96;
const MIN_REFRESH_TIME = 650;

/**
 * Pull down at the top of the page to refresh (touch screens).
 * Captures a downward touch gesture at the top of the page and refreshes after
 * the threshold is crossed. Native overscroll is prevented while pulling so
 * the gesture remains reliable on mobile browsers and installed PWAs.
 */
export const PullToRefresh: React.FC<{ onRefresh: () => Promise<void>; children: React.ReactNode }> = ({
  onRefresh,
  children,
}) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const captured = useRef(false);
  const armed = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  // Latest callback without re-binding the touch listeners on every render
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const resetGesture = () => {
      startY.current = null;
      startX.current = null;
      captured.current = false;
      armed.current = false;
      pullRef.current = 0;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      // Only from the very top, and never while a sheet or dialog is open
      if (
        e.touches.length !== 1 ||
        refreshingRef.current ||
        window.scrollY > 1 ||
        document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        resetGesture();
        return;
      }
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || startX.current === null || e.touches.length !== 1) return;
      const deltaY = e.touches[0].clientY - startY.current;
      const deltaX = e.touches[0].clientX - startX.current;

      if (!captured.current) {
        if (deltaY <= 0 || Math.abs(deltaX) > deltaY) {
          resetGesture();
          return;
        }
        if (deltaY < 5) return;
        captured.current = true;
      }

      if (window.scrollY > 1) {
        resetGesture();
        return;
      }

      e.preventDefault();
      // Resistance: the further you pull, the slower it follows
      const next = Math.min(MAX_PULL, deltaY * 0.65);
      pullRef.current = next;
      setPull(next);

      if (next >= THRESHOLD && !armed.current) {
        armed.current = true;
        navigator.vibrate?.(8);
      } else if (next < THRESHOLD) {
        armed.current = false;
      }
    };

    const finishGesture = async (allowRefresh: boolean) => {
      if (startY.current === null) return;
      const reached = allowRefresh && captured.current && pullRef.current >= THRESHOLD;
      resetGesture();
      if (!reached) return;

      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await Promise.all([
          onRefreshRef.current(),
          new Promise<void>((resolve) => window.setTimeout(resolve, MIN_REFRESH_TIME)),
        ]);
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    const onEnd = () => void finishGesture(true);
    const onCancel = () => void finishGesture(false);

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onCancel);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onCancel);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = refreshing || pull > 4;
  const offset = refreshing ? THRESHOLD * 0.72 : pull * 0.72;
  const ready = pull >= THRESHOLD;

  return (
    <>
      <div
        aria-hidden={!refreshing}
        role={refreshing ? 'status' : undefined}
        aria-label={refreshing ? 'Đang làm mới' : undefined}
        className={cn(
          'pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[320] flex h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-rule bg-surface px-3 text-accent shadow-[var(--shadow-card)]',
          !visible && 'opacity-0',
          !pull && 'transition-[transform,opacity] duration-200'
        )}
        style={{ transform: `translate(-50%, ${offset - 48}px) scale(${refreshing ? 1 : 0.72 + progress * 0.28})` }}
      >
        <RefreshCw
          className={cn('h-5 w-5', refreshing && 'motion-safe:animate-spin')}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
        />
        <span className="whitespace-nowrap text-xs font-semibold">
          {refreshing ? 'Đang làm mới' : ready ? 'Thả để làm mới' : 'Kéo để làm mới'}
        </span>
      </div>
      {children}
    </>
  );
};
