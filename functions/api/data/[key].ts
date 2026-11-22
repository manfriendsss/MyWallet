import type { Ctx } from '../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../server/http';
import { requireUser } from '../../../server/auth';

// What the app may store, and the shape each must have
const KEYS: Record<string, 'array' | 'object'> = {
  wallets: 'array',
  categories: 'array',
  transactions: 'array',
  preferences: 'object',
};
const MAX_BYTES = 1_800_000; // D1 rows top out near 2 MB

/** Save one document: PUT /api/data/<key> with { value } */
export const onRequestPut = async ({ request, env, params }: Ctx<'key'>): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const shape = KEYS[key];
  if (!shape) return fail(404, 'Không có mục dữ liệu này.');

  const body = await readJson(request, MAX_BYTES);
  if (body instanceof Response) return body;
  const value = body.value;
  const okShape = shape === 'array' ? Array.isArray(value) : !!value && typeof value === 'object' && !Array.isArray(value);
  if (!okShape) return fail(400, 'Dữ liệu không đúng định dạng.');

  // Never let an API key reach the database through preferences
  if (shape === 'object') {
    for (const k of Object.keys(value as object)) if (/apikey/i.test(k)) delete (value as Record<string, unknown>)[k];
  }

  const text = JSON.stringify(value);
  if (text.length > MAX_BYTES) return fail(413, 'Dữ liệu quá lớn.');

  // Optimistic concurrency: a write must name the version it was based on. A device holding an
  // older copy (offline for days, a stale tab) is refused instead of silently erasing newer data.
  const base = typeof body.baseUpdatedAt === 'number' && Number.isFinite(body.baseUpdatedAt) ? body.baseUpdatedAt : 0;
  const current = await env.DB.prepare('SELECT value, updated_at FROM user_data WHERE user_id = ? AND key = ?')
    .bind(user.id, key)
    .first<{ value: string; updated_at: number }>();

  if (current && current.updated_at > base) {
    let value: unknown = null;
    try {
      value = JSON.parse(current.value);
    } catch {
      // unreadable copy: report the conflict without it
    }
    return json(409, { error: { message: 'Dữ liệu đã được thay đổi ở thiết bị khác.' }, current: { value, updatedAt: current.updated_at } });
  }

  // Milliseconds, always greater than the copy it replaces (older rows used seconds)
  const updatedAt = Math.max(Date.now(), (current?.updated_at ?? 0) + 1);
  const write = await env.DB.prepare(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
     WHERE user_data.updated_at <= ?`
  )
    .bind(user.id, key, text, updatedAt, current?.updated_at ?? 0)
    .run();
  if (!write.meta.changes) return fail(409, 'Dữ liệu đã được thay đổi ở thiết bị khác.');

  // Keep the replaced copy so a bad write can be undone (best effort: never blocks the save)
  if (current && current.value !== text) {
    try {
      await env.DB.batch([
        env.DB.prepare('INSERT INTO user_data_history (user_id, key, value, updated_at, replaced_at) VALUES (?, ?, ?, ?, ?)').bind(
          user.id,
          key,
          current.value,
          current.updated_at,
          updatedAt
        ),
        env.DB.prepare(
          `DELETE FROM user_data_history WHERE user_id = ? AND key = ? AND id NOT IN (
             SELECT id FROM user_data_history WHERE user_id = ? AND key = ? ORDER BY id DESC LIMIT 60)`
        ).bind(user.id, key, user.id, key),
      ]);
    } catch {
      // history table missing or full: the save itself already succeeded
    }
  }

  return json(200, { ok: true, updatedAt });
};
