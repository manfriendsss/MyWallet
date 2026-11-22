// Merge rules shared by the app and the server (no imports, so both can use this file).
//
// Every wallet, category and transaction carries `updatedAt` (set when it is created or edited),
// and every deletion leaves a tombstone { id: deletedAt }. With those two facts any two copies can
// be combined without losing anything:
//   - an entry on either side is kept; when both have it, the later `updatedAt` wins
//   - an entry is dropped only when a tombstone at least as new as its last edit says so
// So a device that was offline for a week can never erase newer data, and nothing disappears
// unless someone deleted it.

export type ListKey = 'wallets' | 'categories' | 'transactions';
export const LIST_KEYS: ListKey[] = ['wallets', 'categories', 'transactions'];

/** id -> deletedAt (ms) */
export type TombstoneMap = Record<string, number>;
export type Tombstones = Partial<Record<ListKey, TombstoneMap>>;

interface Item {
  id: string;
  updatedAt?: string | number;
  createdAt?: string;
  date?: string;
  time?: string;
}

/** Tombstones older than this are forgotten: no copy that old is still in use */
const TOMBSTONE_TTL_MS = 400 * 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** When an entry was last changed, in ms; entries from before versioning count as 0 */
export function editedAt(item: Item | undefined): number {
  if (!item) return 0;
  const raw = item.updatedAt;
  const ms = typeof raw === 'number' ? raw : Date.parse(raw ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

export function cleanTombstoneMap(value: unknown, now = Date.now()): TombstoneMap {
  const out: TombstoneMap = {};
  if (!isRecord(value)) return out;
  for (const [id, at] of Object.entries(value)) {
    if (typeof at === 'number' && Number.isFinite(at) && now - at < TOMBSTONE_TTL_MS) out[id] = at;
  }
  return out;
}

/** Union of two tombstone maps, keeping the later deletion time */
export function mergeTombstoneMaps(a: unknown, b: unknown, now = Date.now()): TombstoneMap {
  const out = cleanTombstoneMap(a, now);
  for (const [id, at] of Object.entries(cleanTombstoneMap(b, now))) out[id] = Math.max(out[id] ?? 0, at);
  return out;
}

export function mergeTombstones(a: unknown, b: unknown, now = Date.now()): Tombstones {
  const out: Tombstones = {};
  for (const key of LIST_KEYS) {
    const merged = mergeTombstoneMaps(isRecord(a) ? a[key] : undefined, isRecord(b) ? b[key] : undefined, now);
    if (Object.keys(merged).length) out[key] = merged;
  }
  return out;
}

const newestFirst = (a: Item, b: Item) =>
  (b.date ?? '').localeCompare(a.date ?? '') ||
  (b.time ?? '').localeCompare(a.time ?? '') ||
  (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

/**
 * Combine the stored list (`base`) with an incoming one. The later `updatedAt` wins; on a tie the
 * incoming copy wins, since at the same version only recomputed fields (a wallet's balance) differ.
 * An edit always carries a newer `updatedAt`, so a stale device cannot undo it.
 */
export function mergeList<T extends Item>(key: ListKey, base: unknown, incoming: unknown, tombstones: TombstoneMap = {}): T[] {
  const baseList = (Array.isArray(base) ? base : []).filter((x): x is T => isRecord(x) && typeof x.id === 'string');
  const incomingList = (Array.isArray(incoming) ? incoming : []).filter((x): x is T => isRecord(x) && typeof x.id === 'string');

  const byId = new Map<string, T>();
  for (const item of baseList) byId.set(item.id, item);
  for (const item of incomingList) {
    const current = byId.get(item.id);
    if (!current || editedAt(item) >= editedAt(current)) byId.set(item.id, item);
  }

  // Keep a stable order: stored order first, then entries only the incoming copy had
  const order = [...baseList.map((x) => x.id), ...incomingList.map((x) => x.id)];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const item = byId.get(id)!;
    const deletedAt = tombstones[id];
    if (deletedAt !== undefined && deletedAt >= editedAt(item)) continue;
    result.push(item);
  }
  return key === 'transactions' ? result.sort(newestFirst) : result;
}

/** Same content, ignoring order */
export function sameList(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const index = new Map((a as Item[]).map((x) => [x.id, JSON.stringify(x)]));
  return (b as Item[]).every((x) => index.get(x.id) === JSON.stringify(x));
}
