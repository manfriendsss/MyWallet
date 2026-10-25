import { format, isValid, parseISO } from 'date-fns';

/**
 * Local calendar date as YYYY-MM-DD.
 * toISOString() is UTC, so before 07:00 in Vietnam it returned yesterday.
 */
export function toLocalISODate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** randomUUID only exists in secure contexts; plain http on a LAN falls back to getRandomValues */
export function newId(prefix: string): string {
  if (typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function isISODate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}
