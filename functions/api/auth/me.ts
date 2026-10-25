import type { Ctx } from '../../../server/env';
import { json } from '../../../server/http';
import { clearSessionCookie, getSessionUser } from '../../../server/auth';

export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const user = await getSessionUser(request, env);
  if (!user) return json(401, { user: null }, { 'Set-Cookie': clearSessionCookie() });
  return json(
    200,
    { user: { username: user.username, mustChangePassword: user.mustChangePassword } },
    user.renewedCookie ? { 'Set-Cookie': user.renewedCookie } : {}
  );
};
