import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export type Tone = 'accent' | 'income' | 'expense';

export interface ToneTab<T extends string> {
  id: T;
  label: string;
  tone: Tone;
}

const TONE_COLOR: Record<Tone, string> = {
  accent: 'var(--color-accent)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
};

/**
 * Full-width segmented tabs. The active pill travels like a drop of water:
 * it stretches toward the new tab, settles there, and takes on that tab's colour.
 */
export function ToneTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: Array<ToneTab<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ x: 0, w: 0 });
  const prevIndex = useRef(tabs.findIndex((t) => t.id === value));
  const index = tabs.findIndex((t) => t.id === value);
  const active = tabs[index] ?? tabs[0];
  const travelled = Math.abs(index - prevIndex.current);

  useLayoutEffect(() => {
    const measure = () => {
      const btn = wrapRef.current?.querySelectorAll<HTMLButtonElement>('button')[index];
      if (btn) setBox({ x: btn.offsetLeft, w: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    prevIndex.current = index;
    return () => ro.disconnect();
  }, [index]);

  return (
    <div
      ref={wrapRef}
      role="tablist"
      aria-label={label}
      className={cn('relative flex w-full gap-1 rounded-card bg-paper-3 p-1', className)}
    >
      {box.w > 0 && (
        <motion.span
          aria-hidden="true"
          className="absolute top-1 bottom-1 left-0 rounded-[12px]"
          initial={false}
          animate={{
            x: box.x,
            width: box.w,
            backgroundColor: TONE_COLOR[active.tone],
            // The drop: wider and flatter mid-flight, then springs back
            scaleX: travelled ? [1, 1 + 0.18 * travelled, 1] : 1,
            scaleY: travelled ? [1, 0.82, 1] : 1,
          }}
          transition={{
            x: { type: 'spring', stiffness: 380, damping: 30 },
            width: { type: 'spring', stiffness: 380, damping: 30 },
            backgroundColor: { duration: 0.35, ease: 'easeOut' },
            scaleX: { duration: 0.42, times: [0, 0.45, 1], ease: 'easeInOut' },
            scaleY: { duration: 0.42, times: [0, 0.45, 1], ease: 'easeInOut' },
          }}
        />
      )}
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-[1] min-h-10 min-w-0 flex-1 whitespace-nowrap rounded-[12px] px-2 text-xs font-semibold transition-colors duration-200 sm:px-3 sm:text-sm',
              selected ? 'text-accent-ink' : 'text-muted hover:text-ink'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
