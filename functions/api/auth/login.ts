import type { Ctx } from '../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../server/http';
import {
  DUMMY_HASH,
  clearLoginFailures,
  createSession,
  loginBlocked,
  recordLoginFailure,
  verifyPassword,
} from '../../../server/auth';

export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  if (await loginBlocked(request, env)) {
    return fail(429, 'Sai mật khẩu quá nhiều lần. Đợi 15 phút rồi thử lại.');
  }

  const body = await readJson(request, 2_000);
  if (body instanceof Response) return body;
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 64) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 200) : '';

  const user = username
    ? await env.DB.prepare('SELECT id, username, password_hash, must_change_password FROM users WHERE username = ?')
        .bind(username)
        .first<{ id: number; username: string; password_hash: string; must_change_password: number }>()
    : null;

  // Always run the hash, so an unknown username takes as long as a wrong password
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    await recordLoginFailure(request, env);
    return fail(401, 'Sai tên đăng nhập hoặc mật khẩu.');
  }

  await clearLoginFailures(request, env);
  const cookie = await createSession(env, user.id, request);
  return json(
    200,
    { user: { username: user.username, mustChangePassword: user.must_change_password === 1 } },
    { 'Set-Cookie': cookie }
  );
};
