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

  const updatedAt = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(user.id, key, text, updatedAt)
    .run();

  return json(200, { ok: true, updatedAt });
};
