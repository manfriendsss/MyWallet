import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { CurrencyCode } from '../types';

export function formatCurrency(amount: number, currency: CurrencyCode = 'VND'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';

  switch (currency) {
    case 'VND':
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount);

    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

    case 'PLN':
      return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

    case 'EUR':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

    case 'GBP':
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);

    case 'JPY':
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
      }).format(amount);

    default:
      return `${amount.toLocaleString('vi-VN')} ${currency}`;
  }
}

export function formatCompactCurrency(amount: number, currency: CurrencyCode = 'VND'): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
  }
  if (Math.abs(amount) >= 1_000 && currency === 'VND') {
    return `${(amount / 1_000).toFixed(0)}k`;
  }
  return formatCurrency(amount, currency);
}

export function formatDateVietnamese(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Hôm nay';
    if (isYesterday(date)) return 'Hôm qua';
    return format(date, 'EEEE, dd/MM/yyyy', { locale: vi });
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'dd/MM', { locale: vi });
  } catch {
    return dateString;
  }
}
