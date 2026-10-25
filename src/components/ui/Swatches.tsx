import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/** Colour picker as a radio group: each swatch is labelled and keyboard reachable */
export const Swatches: React.FC<{
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}> = ({ label, colors, value, onChange }) => (
  <fieldset>
    <legend className="label">{label}</legend>
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {colors.map((c, i) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`Màu ${i + 1}`}
            onClick={() => onChange(c)}
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-shadow',
              selected && 'ring-2 ring-ink'
            )}
            style={{ backgroundColor: c }}
          >
            {selected && <Check className="w-4 h-4 text-on-data" strokeWidth={3} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  </fieldset>
);

/** Icon tile in a record's own colour (wallet, category) */
export const ColorTile: React.FC<{ color?: string; size?: 'sm' | 'md'; children: React.ReactNode }> = ({
  color,
  size = 'md',
  children,
}) => (
  <span
    aria-hidden="true"
    className={cn(
      'grid shrink-0 place-items-center text-on-data',
      size === 'md' ? 'h-9 w-9 rounded-control' : 'h-7 w-7 rounded-chip'
    )}
    style={{ backgroundColor: color || 'var(--color-muted)' }}
  >
    {children}
  </span>
);
