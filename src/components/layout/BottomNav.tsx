import React, { useLayoutEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { cn } from '../../utils/cn';
import { NAV_ITEMS } from './navItems';

// Geometry of the notch, in px. The + button sits on a circle concentric with the notch.
const BUTTON_R = 28; // 56px button
const GAP = 6; // even ring of air between button and bar
const NOTCH_R = BUTTON_R + GAP;
const CENTER_Y = 4; // button centre, measured down from the bar's top edge
const FILLET = 12; // rounds the corner where the notch meets the top edge
const CORNER = 24; // bar's top-left and top-right radius

/** Outline of the bar: rounded top corners, a round notch with filleted shoulders */
function barPath(w: number, h: number): string {
  const cx = w / 2;
  // Fillet circle: tangent to the top edge and to the notch circle from outside
  const fx = Math.sqrt((NOTCH_R + FILLET) ** 2 - (FILLET - CENTER_Y) ** 2);
  const k = NOTCH_R / (NOTCH_R + FILLET);
  const tx = fx * k; // tangent point, horizontal offset from centre
  const ty = CENTER_Y + (FILLET - CENTER_Y) * k;
  const largeArc = ty < CENTER_Y ? 1 : 0;

  return [
    `M0 ${h}`,
    `L0 ${CORNER}`,
    `A${CORNER} ${CORNER} 0 0 1 ${CORNER} 0`,
    `L${cx - fx} 0`,
    `A${FILLET} ${FILLET} 0 0 1 ${cx - tx} ${ty}`,
    `A${NOTCH_R} ${NOTCH_R} 0 ${largeArc} 0 ${cx + tx} ${ty}`,
    `A${FILLET} ${FILLET} 0 0 1 ${cx + fx} 0`,
    `L${w - CORNER} 0`,
    `A${CORNER} ${CORNER} 0 0 1 ${w} ${CORNER}`,
    `L${w} ${h}`,
    'Z',
  ].join(' ');
}

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openAssistant } = useWallet();
  const barRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    return (
      <li key={item.id} className="min-w-0 flex-1 basis-0">
        <button
          type="button"
          onClick={() => setActiveTab(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex h-16 w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-semibold transition-colors min-[380px]:text-xs',
            isActive ? 'text-accent' : 'text-muted hover:text-ink'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="max-w-full whitespace-nowrap leading-none">{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Điều hướng chính" className="md:hidden fixed bottom-0 inset-x-0 z-[300]">
      <div ref={barRef} className="relative pb-safe">
        {size.w > 0 && (
          <svg
            aria-hidden="true"
            className="bottom-bar-shape absolute inset-0 h-full w-full overflow-visible"
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
          >
            <path d={barPath(size.w, size.h + 1)} />
          </svg>
        )}

        <ul className="relative mx-auto flex max-w-md items-center px-2">
          {NAV_ITEMS.slice(0, 2).map(renderItem)}
          <li className="w-[4.5rem] shrink-0" aria-hidden="true" />
          {NAV_ITEMS.slice(2).map(renderItem)}
        </ul>
      </div>

      {/* Primary action: add a transaction through the assistant */}
      <button
        type="button"
        onClick={openAssistant}
        style={{ top: CENTER_Y - BUTTON_R }}
        className="absolute left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-[image:var(--gradient-accent)] text-accent-ink shadow-[0_6px_12px_-4px_oklch(30%_0.08_45/0.35)] transition-transform active:scale-95"
        aria-label="Thêm giao dịch"
      >
        <Plus className="w-7 h-7" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </nav>
  );
};
