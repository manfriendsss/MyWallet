import type { Ctx } from '../../../server/env';
import { fail, json } from '../../../server/http';
import { requireUser } from '../../../server/auth';

/** Saved versions of the wallet data: GET /api/data/history -> newest first, with entry counts */
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, key, updated_at, replaced_at,
              CASE WHEN json_valid(value) THEN json_array_length(value) ELSE NULL END AS count
         FROM user_data_history
        WHERE user_id = ? AND key IN ('wallets', 'categories', 'transactions')
        ORDER BY id DESC LIMIT 200`
    )
      .bind(user.id)
      .all<{ id: number; key: string; updated_at: number; replaced_at: number; count: number | null }>();

    // Versions saved before timestamps became milliseconds used seconds
    const ms = (t: number) => (t < 1e12 ? t * 1000 : t);
    return json(200, {
      versions: results.map((r) => ({ id: r.id, key: r.key, savedAt: ms(r.updated_at), replacedAt: ms(r.replaced_at), count: r.count })),
    });
  } catch {
    return fail(503, 'Chưa đọc được lịch sử, thử lại sau.');
  }
};
