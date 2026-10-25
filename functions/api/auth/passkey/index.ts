import type { Ctx } from '../../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../../server/http';
import { requireUser } from '../../../../server/auth';

/** The signed-in user's passkeys (no key material, just names and dates) */
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const { results } = await env.DB.prepare(
    'SELECT id, name, created_at, last_used_at FROM passkeys WHERE user_id = ? ORDER BY created_at DESC'
  )
    .bind(user.id)
    .all<{ id: string; name: string | null; created_at: number; last_used_at: number | null }>();
  return json(200, {
    passkeys: results.map((p) => ({ id: p.id, name: p.name, createdAt: p.created_at, lastUsedAt: p.last_used_at })),
  });
};

/** Remove one of the user's passkeys: DELETE with { id } */
export const onRequestDelete = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const body = await readJson(request, 2_000);
  if (body instanceof Response) return body;
  if (typeof body.id !== 'string') return fail(400, 'Thiếu passkey cần xóa.');
  await env.DB.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').bind(body.id, user.id).run();
  return json(200, { ok: true });
};
