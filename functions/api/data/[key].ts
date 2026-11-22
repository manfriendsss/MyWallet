import type { Ctx } from '../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../server/http';
import { requireUser } from '../../../server/auth';
import { addTombstones, isListKey, readDoc, saveList, writeDoc } from '../../../server/store';
import { cleanTombstoneMap, mergeTombstones, sameList } from '../../../src/services/syncMerge';

const MAX_BYTES = 1_800_000; // D1 rows top out near 2 MB

/**
 * Save one document: PUT /api/data/<key> with { value, tombstones? }.
 *
 * Lists (wallets, categories, transactions) are merged into what is stored, never written over it:
 * an entry disappears only when the request (or an earlier one) recorded its deletion. That holds
 * for every client, including old app versions that know nothing about merging, so opening the app
 * on any device can never erase data. When the stored result differs from what was sent, it is
 * returned as `value` so the device can show it.
 */
export const onRequestPut = async ({ request, env, params }: Ctx<'key'>): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  if (!isListKey(key) && key !== 'preferences' && key !== 'tombstones') return fail(404, 'Không có mục dữ liệu này.');

  const body = await readJson(request, MAX_BYTES);
  if (body instanceof Response) return body;
  const value = body.value;

  try {
    if (isListKey(key)) {
      if (!Array.isArray(value)) return fail(400, 'Dữ liệu không đúng định dạng.');
      if (JSON.stringify(value).length > MAX_BYTES) return fail(413, 'Dữ liệu quá lớn.');
      const tombstones = { [key]: cleanTombstoneMap(body.tombstones) };
      const saved = await saveList(env, user.id, key, value, tombstones);
      return json(200, { ok: true, updatedAt: saved.updatedAt, ...(sameList(saved.value, value) ? {} : { value: saved.value }) });
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(400, 'Dữ liệu không đúng định dạng.');

    if (key === 'tombstones') {
      const merged = await addTombstones(env, user.id, mergeTombstones(value, {}));
      return json(200, { ok: true, value: merged });
    }

    // Preferences: small settings, last write wins. Never let an API key reach the database.
    const prefs = { ...(value as Record<string, unknown>) };
    for (const k of Object.keys(prefs)) if (/apikey/i.test(k)) delete prefs[k];
    const text = JSON.stringify(prefs);
    if (text.length > 10_000) return fail(413, 'Dữ liệu quá lớn.');
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await readDoc(env, user.id, key);
      if (current?.text === text) return json(200, { ok: true, updatedAt: current.updatedAt });
      const updatedAt = await writeDoc(env, user.id, key, text, current);
      if (updatedAt !== null) return json(200, { ok: true, updatedAt });
    }
    return fail(503, 'Máy chủ đang bận, thử lại sau.');
  } catch {
    return fail(503, 'Máy chủ đang bận, thử lại sau.');
  }
};
