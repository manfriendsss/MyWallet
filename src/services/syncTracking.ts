import type { SyncKey } from './api';
import { mergeTombstones, type ListKey, type Tombstones } from './syncMerge';

// --- Server versions -------------------------------------------------------------
const VERSIONS_KEY = 'mywallet_sync_versions';
const TOMBSTONES_KEY = 'mywallet_tombstones';

export type SyncVersions = Partial<Record<SyncKey, number>>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable: the server keeps its own copy
  }
}

export const readVersions = () => readJson<SyncVersions>(VERSIONS_KEY, {});
export const writeVersions = (versions: SyncVersions) => writeJson(VERSIONS_KEY, versions);

// --- Deletions ---------------------------------------------------------------------
export const readTombstones = () => mergeTombstones(readJson<Tombstones>(TOMBSTONES_KEY, {}), {});
export const writeTombstones = (tombstones: Tombstones) => writeJson(TOMBSTONES_KEY, tombstones);

/** Fields recomputed from other data: a change there is not an edit */
const DERIVED: Partial<Record<ListKey, string[]>> = { wallets: ['currentBalance'] };

function contentOf(item: Record<string, unknown>, key: ListKey): string {
  const { updatedAt: _ignored, ...rest } = item;
  for (const field of DERIVED[key] ?? []) delete rest[field];
  return JSON.stringify(rest);
}

/**
 * Compare a list before and after a user action: stamp new and edited entries with `updatedAt`,
 * and report the ids that were removed so they can be recorded as deletions.
 */
export function trackChanges<T extends { id: string; updatedAt?: string }>(
  key: ListKey,
  prev: T[],
  next: T[]
): { list: T[]; removed: string[] } {
  const now = new Date().toISOString();
  const before = new Map(prev.map((item) => [item.id, item]));
  const list = next.map((item) => {
    const old = before.get(item.id);
    const changed = !old || contentOf(old as unknown as Record<string, unknown>, key) !== contentOf(item as unknown as Record<string, unknown>, key);
    return changed ? { ...item, updatedAt: now } : item;
  });
  const kept = new Set(next.map((item) => item.id));
  const removed = prev.filter((item) => !kept.has(item.id)).map((item) => item.id);
  return { list, removed };
}
