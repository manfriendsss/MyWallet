import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';

const THRESHOLD = 72; // px of pull needed to refresh
const MAX_PULL = 110;

/**
 * Pull down at the top of the page to refresh (touch screens).
 * Only the indicator moves; the content never shifts, so nothing reflows.
 */
export const PullToRefresh: React.FC<{ onRefresh: () => Promise<void>; children: React.ReactNode }> = ({
  onRefresh,
  children,
}) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  // Latest callback without re-binding the touch listeners on every render
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      // Only from the very top, and never while a sheet or dialog is open
      if (refreshingRef.current || window.scrollY > 0 || document.querySelector('[role="dialog"]')) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || window.scrollY > 0) {
        startY.current = delta < 0 ? null : startY.current;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      // Resistance: the further you pull, the slower it follows
      const next = Math.min(MAX_PULL, delta * 0.5);
      pullRef.current = next;
      setPull(next);
    };
    const onEnd = async () => {
      if (startY.current === null) return;
      startY.current = null;
      const reached = pullRef.current >= THRESHOLD;
      pullRef.current = 0;
      setPull(0);
      if (!reached) return;
      refreshingRef.current = true;
      setRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        refreshingRef.current = false;
        setRefreshing(false);
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const progress = Math.min(1, pull / THRESHOLD);
  const visible = refreshing || pull > 4;
  const offset = refreshing ? THRESHOLD * 0.7 : pull * 0.7;

  return (
    <>
      <div
        aria-hidden={!refreshing}
        role={refreshing ? 'status' : undefined}
        aria-label={refreshing ? 'Đang làm mới' : undefined}
        className={cn(
          'pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+3.5rem)] z-[320] -ml-5 grid h-10 w-10 place-items-center rounded-full border border-rule bg-surface text-accent shadow-[var(--shadow-card)]',
          !visible && 'opacity-0',
          !pull && 'transition-[transform,opacity] duration-200'
        )}
        style={{ transform: `translateY(${offset - 48}px) scale(${refreshing ? 1 : 0.6 + progress * 0.4})` }}
      >
        <RefreshCw
          className={cn('h-5 w-5', refreshing && 'motion-safe:animate-spin')}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
        />
      </div>
      {children}
    </>
  );
};
