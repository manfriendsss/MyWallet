import type { SyncKey } from './api';

// --- Server versions -------------------------------------------------------------
// The server's `updatedAt` for each document as this device last saw it. Every save names it,
// so a device holding an older copy gets a conflict to merge instead of overwriting newer data.
const VERSIONS_KEY = 'mywallet_sync_versions';

export type SyncVersions = Partial<Record<SyncKey, number>>;

export function readVersions(): SyncVersions {
  try {
    const raw = JSON.parse(localStorage.getItem(VERSIONS_KEY) ?? '{}');
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as SyncVersions) : {};
  } catch {
    return {};
  }
}

export function writeVersions(versions: SyncVersions) {
  try {
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions));
  } catch {
    // storage unavailable: the next save simply merges with the server copy
  }
}

/** Server versions were whole seconds before they became milliseconds */
const toMs = (version: number) => (version > 0 && version < 1e12 ? version * 1000 : version);

interface WithId {
  id: string;
  createdAt?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * Combine this device's copy with a newer server copy, losing nothing that was added on either side.
 * - The server's version of an entry wins when both have it.
 * - An entry only this device has is kept, unless it is a transaction created before the copy this
 *   device started from (then another device deleted it on purpose).
 * - Entries only the server has are kept.
 */
export function mergeDocument(key: SyncKey, local: unknown, remote: unknown, baseVersion: number): unknown {
  if (key === 'preferences') {
    return { ...(isRecord(local) ? local : {}), ...(isRecord(remote) ? remote : {}) };
  }

  const remoteList = Array.isArray(remote) ? (remote as WithId[]) : [];
  const localList = Array.isArray(local) ? (local as WithId[]) : [];
  const remoteIds = new Set(remoteList.map((item) => item?.id));
  const baseMs = toMs(baseVersion);

  const localOnly = localList.filter((item) => {
    if (!item || typeof item.id !== 'string' || remoteIds.has(item.id)) return false;
    if (key !== 'transactions' || baseMs <= 0) return true;
    const created = Date.parse(item.createdAt ?? '');
    return !Number.isFinite(created) || created > baseMs;
  });

  // New transactions go first, like the app's own ordering of fresh entries
  return key === 'transactions' ? [...localOnly, ...remoteList] : [...remoteList, ...localOnly];
}
