import type { Ctx } from '../../../server/env';
import { json, rejectCrossSite } from '../../../server/http';
import { clearSessionCookie, getSessionUser } from '../../../server/auth';

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  const user = await getSessionUser(request, env);
  if (user) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user.tokenHash).run();
  return json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
};
