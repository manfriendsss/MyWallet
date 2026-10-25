import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { CurrencyCode } from '../types';

interface CurrencyStyle {
  symbol: string;
  prefix: boolean;
  decimals: number;
}

const styleCache = new Map<string, CurrencyStyle>();

/**
 * The symbol each currency is known by ($, €, £, ¥, CN¥, ₩, zł, Kč, kr, CHF…).
 * Symbols ending in a sign go before the number; word-like symbols follow it. VND is always "đ".
 */
function currencyStyle(code: CurrencyCode): CurrencyStyle {
  const cached = styleCache.get(code);
  if (cached) return cached;

  let style: CurrencyStyle = { symbol: code, prefix: false, decimals: 2 };
  if (code === 'VND') {
    style = { symbol: 'đ', prefix: false, decimals: 0 };
  } else {
    try {
      const pick = (display: 'symbol' | 'narrowSymbol') =>
        new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: display })
          .formatToParts(1)
          .find((p) => p.type === 'currency')?.value ?? code;
      let symbol = pick('symbol');
      if (symbol === code) symbol = pick('narrowSymbol');
      const decimals = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
        .maximumFractionDigits ?? 2;
      style = { symbol, prefix: !/\p{L}$/u.test(symbol), decimals };
    } catch {
      // unknown code: show it as letters after the number
    }
  }
  styleCache.set(code, style);
  return style;
}

/**
 * Full amount with the currency's symbol, Vietnamese digit grouping: 2.175.000 đ, $585, €12,5, 735 zł.
 * Never abbreviated.
 */
export function formatCurrency(amount: number, currency: CurrencyCode = 'VND'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const { symbol, prefix, decimals } = currencyStyle(currency);
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(value).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return prefix ? `${sign}${symbol}${digits}` : `${sign}${digits} ${symbol}`;
}

/** Kept for existing callers: amounts are always written out in full */
export function formatCompactCurrency(amount: number, currency: CurrencyCode = 'VND'): string {
  return formatCurrency(amount, currency);
}

export function formatDateVietnamese(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Hôm nay';
    if (isYesterday(date)) return 'Hôm qua';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}

/** The app's one date format: dd/mm/yyyy */
export function formatShortDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM/yyyy', { locale: vi });
  } catch {
    return dateString;
  }
}

export function formatDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

export function formatDateTime(date: Date): string {
  return format(date, 'dd/MM/yyyy HH:mm');
}
