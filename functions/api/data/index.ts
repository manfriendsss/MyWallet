import type { Ctx } from '../../../server/env';
import { json } from '../../../server/http';
import { requireUser } from '../../../server/auth';

/** Everything the app stores for this user, as { key: { value, updatedAt } } */
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const { results } = await env.DB.prepare('SELECT key, value, updated_at FROM user_data WHERE user_id = ?')
    .bind(user.id)
    .all<{ key: string; value: string; updated_at: number }>();

  const data: Record<string, { value: unknown; updatedAt: number }> = {};
  for (const row of results) {
    try {
      data[row.key] = { value: JSON.parse(row.value), updatedAt: row.updated_at };
    } catch {
      // a broken row is skipped rather than breaking the whole load
    }
  }
  return json(200, { data }, user.renewedCookie ? { 'Set-Cookie': user.renewedCookie } : {});
};
