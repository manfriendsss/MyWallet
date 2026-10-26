import type { ActiveTab } from '../types';

export const APP_HISTORY_KEY = '__myWalletNavigation';
export const DIALOG_HISTORY_KEY = '__myWalletDialog';

export interface AppHistoryEntry {
  tab: ActiveTab;
  depth: number;
}

const ACTIVE_TABS: ActiveTab[] = ['dashboard', 'calendar', 'analytics', 'settings', 'transactions'];

export function asHistoryRecord(state: unknown): Record<string, unknown> {
  return state !== null && typeof state === 'object' ? (state as Record<string, unknown>) : {};
}

export function readAppHistoryEntry(state: unknown): AppHistoryEntry | null {
  const value = asHistoryRecord(state)[APP_HISTORY_KEY];
  if (value === null || typeof value !== 'object') return null;

  const candidate = value as Partial<AppHistoryEntry>;
  if (!ACTIVE_TABS.includes(candidate.tab as ActiveTab) || !Number.isInteger(candidate.depth) || candidate.depth! < 0) {
    return null;
  }

  return { tab: candidate.tab as ActiveTab, depth: candidate.depth! };
}

export function withoutDialogHistory(state: unknown): Record<string, unknown> {
  const next = { ...asHistoryRecord(state) };
  delete next[DIALOG_HISTORY_KEY];
  return next;
}
