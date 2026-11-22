import type { Ctx } from '../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../server/http';
import { requireUser } from '../../../server/auth';
import { readDoc, saveList } from '../../../server/store';
import { LIST_KEYS, type ListKey } from '../../../src/services/syncMerge';

const MAX_BYTES = 6_000_000;

/**
 * Bring entries back: POST /api/data/restore with { id } (a saved version) or { docs } (an exported
 * backup file). Restoring only adds what the source has and the account is missing now; it never
 * removes or overwrites current entries, so it is always safe to try.
 */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await readJson(request, MAX_BYTES);
  if (body instanceof Response) return body;

  const docs: Partial<Record<ListKey, unknown[]>> = {};
  if (typeof body.id === 'number') {
    const row = await env.DB.prepare('SELECT key, value FROM user_data_history WHERE id = ? AND user_id = ?')
      .bind(body.id, user.id)
      .first<{ key: string; value: string }>();
    if (!row || !(LIST_KEYS as string[]).includes(row.key)) return fail(404, 'Không tìm thấy bản lưu này.');
    try {
      const value = JSON.parse(row.value);
      if (Array.isArray(value)) docs[row.key as ListKey] = value;
    } catch {
      return fail(422, 'Bản lưu này bị hỏng.');
    }
  } else if (body.docs && typeof body.docs === 'object') {
    for (const key of LIST_KEYS) {
      const value = (body.docs as Record<string, unknown>)[key];
      if (Array.isArray(value)) docs[key] = value;
    }
  }
  if (Object.keys(docs).length === 0) return fail(400, 'Không có dữ liệu để khôi phục.');

  try {
    const restored: Partial<Record<ListKey, number>> = {};
    const now = new Date().toISOString();
    for (const key of LIST_KEYS) {
      const source = docs[key];
      if (!source) continue;
      const current = await readDoc(env, user.id, key);
      const present = new Set((Array.isArray(current?.value) ? current.value : []).map((x: { id?: string }) => x?.id));
      // Stamped now, so they win over any older deletion recorded for them on other devices
      const missing = source
        .filter((x): x is { id: string } => !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string')
        .filter((x) => !present.has(x.id))
        .map((x) => ({ ...x, updatedAt: now }));
      restored[key] = missing.length;
      if (missing.length) await saveList(env, user.id, key, missing, {});
    }
    return json(200, { ok: true, restored });
  } catch {
    return fail(503, 'Máy chủ đang bận, thử lại sau.');
  }
};
