import type { Ctx } from '../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../server/http';
import { hashPassword, passwordProblem, recordLoginFailure, loginBlocked, requireUser, verifyPassword } from '../../../server/auth';

/** Change password. Works for the first-login change too; afterwards every other device is signed out. */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  const user = await requireUser(request, env, true);
  if (user instanceof Response) return user;

  if (await loginBlocked(request, env)) return fail(429, 'Sai mật khẩu quá nhiều lần. Đợi 15 phút rồi thử lại.');

  const body = await readJson(request, 2_000);
  if (body instanceof Response) return body;
  const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const next = body.newPassword;

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    await recordLoginFailure(request, env);
    return fail(401, 'Mật khẩu hiện tại không đúng.');
  }

  const problem = passwordProblem(next);
  if (problem) return fail(400, problem);
  if (next === current) return fail(400, 'Mật khẩu mới phải khác mật khẩu hiện tại.');

  const hash = await hashPassword(next as string);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = unixepoch() WHERE id = ?').bind(hash, user.id),
    // Sign out every other device; this one stays signed in
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(user.id, user.tokenHash),
  ]);

  return json(200, { user: { username: user.username, mustChangePassword: false } });
};
