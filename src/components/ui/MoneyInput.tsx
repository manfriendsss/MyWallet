import React, { useLayoutEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode'>;

interface MoneyInputProps extends NativeInputProps {
  /** Plain machine number as a string ("1234567.5" or ""), the same shape the forms already store */
  value: string;
  onValueChange: (raw: string) => void;
  /** VND has no decimals; other currencies keep up to two */
  currency?: string;
  allowNegative?: boolean;
}

const ZERO_DECIMAL = new Set(['VND', 'JPY', 'KRW', 'HUF']);

/** "1234567.5" -> "1.234.567,5": dots group thousands, a comma marks decimals, as Vietnamese writes money */
export function formatMoneyInput(raw: string): string {
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const [int, frac] = raw.replace('-', '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}${grouped}${frac !== undefined ? `,${frac}` : ''}`;
}

/**
 * What the user typed -> plain number string. A comma is always the decimal mark; a dot is one too
 * when fewer than three digits follow it (a dot we inserted always has exactly three after it),
 * so "1.5" from an English keypad still means one and a half.
 */
export function parseMoneyInput(text: string, maxDecimals: number, allowNegative = false): string {
  const negative = allowNegative && text.trim().startsWith('-');
  const s = text.replace(/[^\d.,]/g, '');
  let int = s;
  let frac: string | undefined;

  if (maxDecimals > 0) {
    const i = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    const tail = i >= 0 ? s.slice(i + 1) : '';
    if (i >= 0 && (s[i] === ',' || !/^\d{3}/.test(tail))) {
      int = s.slice(0, i);
      frac = tail.replace(/\D/g, '').slice(0, maxDecimals);
    }
  }

  int = int.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (frac !== undefined && !int) int = '0';
  const raw = frac !== undefined ? `${int}.${frac}` : int;
  return raw ? `${negative ? '-' : ''}${raw}` : negative ? '-' : '';
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onValueChange,
  currency = 'VND',
  allowNegative = false,
  className,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Digits left of the caret before reformatting, so the caret stays put when dots appear */
  const caretDigits = useRef<number | null>(null);
  const display = formatMoneyInput(value);

  useLayoutEffect(() => {
    const el = inputRef.current;
    const wanted = caretDigits.current;
    if (!el || wanted === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < display.length && seen < wanted) {
      if (/[\d,-]/.test(display[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  }, [display]);

  return (
    <input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={(event) => {
        const { value: typed, selectionStart } = event.target;
        // Count against the whole text: a dot is a decimal mark only when fewer than three digits follow it
        const caret = selectionStart ?? typed.length;
        caretDigits.current = [...typed.matchAll(/[\d,-]|\.(?!\d{3})/g)].filter((m) => m.index < caret).length;
        onValueChange(parseMoneyInput(typed, ZERO_DECIMAL.has(currency) ? 0 : 2, allowNegative));
      }}
      className={cn('figure', className)}
    />
  );
};
