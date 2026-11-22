import type { Env } from './env';
import { LIST_KEYS, mergeList, mergeTombstones, sameList, type ListKey, type Tombstones } from '../src/services/syncMerge';

// One JSON document per user and key. Every replaced copy goes to user_data_history, which keeps
// the last 60 versions plus the last version of each day for 90 days, so any bad write can be undone.

export interface StoredDoc {
  value: unknown;
  text: string;
  updatedAt: number;
}

const HISTORY_RECENT = 60;
const HISTORY_DAILY_MS = 90 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isListKey = (key: string): key is ListKey => (LIST_KEYS as string[]).includes(key);

export async function readDoc(env: Env, userId: number, key: string): Promise<StoredDoc | null> {
  const row = await env.DB.prepare('SELECT value, updated_at FROM user_data WHERE user_id = ? AND key = ?')
    .bind(userId, key)
    .first<{ value: string; updated_at: number }>();
  if (!row) return null;
  let value: unknown = null;
  try {
    value = JSON.parse(row.value);
  } catch {
    // unreadable copy: treated as empty, but still archived before it is replaced
  }
  return { value, text: row.value, updatedAt: row.updated_at };
}

/**
 * Replace a document only if nobody saved it since `current` was read; archives the old copy.
 * Returns the new version, or null when another save got there first (the caller re-reads and retries).
 */
export async function writeDoc(env: Env, userId: number, key: string, text: string, current: StoredDoc | null): Promise<number | null> {
  // Milliseconds, always greater than the copy it replaces (older rows used seconds)
  const updatedAt = Math.max(Date.now(), (current?.updatedAt ?? 0) + 1);
  const write = current
    ? await env.DB.prepare('UPDATE user_data SET value = ?, updated_at = ? WHERE user_id = ? AND key = ? AND updated_at = ?')
        .bind(text, updatedAt, userId, key, current.updatedAt)
        .run()
    : await env.DB.prepare('INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT (user_id, key) DO NOTHING')
        .bind(userId, key, text, updatedAt)
        .run();
  if (!write.meta.changes) return null;

  if (current && current.text !== text) {
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO user_data_history (user_id, key, value, updated_at, replaced_at) VALUES (?, ?, ?, ?, ?)').bind(
          userId,
          key,
          current.text,
          current.updatedAt,
          updatedAt
        ),
        env.DB.prepare(
          `DELETE FROM user_data_history WHERE user_id = ?1 AND key = ?2
             AND id NOT IN (SELECT id FROM user_data_history WHERE user_id = ?1 AND key = ?2 ORDER BY id DESC LIMIT ?3)
             AND id NOT IN (SELECT max(id) FROM user_data_history WHERE user_id = ?1 AND key = ?2 AND replaced_at > ?4
                            GROUP BY replaced_at / ?5)`
        ).bind(userId, key, HISTORY_RECENT, updatedAt - HISTORY_DAILY_MS, DAY_MS),
      ]);
    } catch {
      // history is best effort: the save itself already succeeded
    }
  }
  return updatedAt;
}

/** Add deletions to the account's tombstones (never removes one) and return the full set */
export async function addTombstones(env: Env, userId: number, incoming: Tombstones): Promise<Tombstones> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readDoc(env, userId, 'tombstones');
    const merged = mergeTombstones(current?.value, incoming);
    const text = JSON.stringify(merged);
    if (current && current.text === text) return merged;
    if (!current && Object.keys(merged).length === 0) return merged;
    if ((await writeDoc(env, userId, 'tombstones', text, current)) !== null) return merged;
  }
  throw new Error('tombstones busy');
}

/**
 * Merge an incoming list into the stored one and save the result. Nothing stored is lost unless a
 * tombstone covers it, so a stale or buggy device cannot erase entries. Returns what is now stored.
 */
export async function saveList(
  env: Env,
  userId: number,
  key: ListKey,
  incoming: unknown[],
  tombstones: Tombstones
): Promise<{ value: unknown[]; updatedAt: number }> {
  const allTombstones = await addTombstones(env, userId, tombstones);
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readDoc(env, userId, key);
    const merged = mergeList(key, current?.value, incoming, allTombstones[key]);
    if (current && sameList(current.value, merged)) return { value: merged, updatedAt: current.updatedAt };
    const updatedAt = await writeDoc(env, userId, key, JSON.stringify(merged), current);
    if (updatedAt !== null) return { value: merged, updatedAt };
  }
  throw new Error('list busy');
}
