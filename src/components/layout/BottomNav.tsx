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
      <li key={item.id} className="flex-1">
        <button
          type="button"
          onClick={() => setActiveTab(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors',
            isActive ? 'text-accent' : 'text-muted hover:text-ink'
          )}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Điều hướng chính" className="md:hidden fixed bottom-0 inset-x-0 z-[300]">
      <div ref={barRef} className="relative pb-safe">
        {/* Fill only the device safe area. Keeping the upper wrapper transparent
            lets the SVG's rounded top corners remain visibly rounded. */}
        <div aria-hidden="true" className="glass-panel absolute inset-x-0 bottom-0 h-[max(var(--space-xs),env(safe-area-inset-bottom))]" />
        {/* Frosted backdrop cut to the bar's outline; the SVG above adds the tint, hairline and shadow */}
        {size.w > 0 && (
          <div
            aria-hidden="true"
            className="glass-backdrop absolute inset-0"
            style={{ clipPath: `path('${barPath(size.w, size.h + 1)}')` }}
          />
        )}
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
          <li className="w-20 shrink-0" aria-hidden="true" />
          {NAV_ITEMS.slice(2).map(renderItem)}
        </ul>
      </div>

      {/* Primary action: add a transaction through the assistant */}
      <button
        type="button"
        onClick={openAssistant}
        style={{ top: CENTER_Y - BUTTON_R }}
        className="fab-glass absolute left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full text-white transition-transform active:scale-95"
        aria-label="Thêm giao dịch"
      >
        <Plus className="w-7 h-7 drop-shadow-[0_1px_1px_oklch(35%_0.12_40/0.45)]" strokeWidth={3.25} aria-hidden="true" />
      </button>
    </nav>
  );
};
