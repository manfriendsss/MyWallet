import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { Ctx } from '../../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../../server/http';
import { clearLoginFailures, createSession, loginBlocked, recordLoginFailure } from '../../../../server/auth';
import { fromB64url, relyingParty, takeChallenge } from '../../../../server/passkey';

/** Step 2 of signing in with a passkey: verify the signature, then start a normal session */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  if (await loginBlocked(request, env)) return fail(429, 'Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.');

  const body = await readJson(request, 20_000);
  if (body instanceof Response) return body;

  const expectedChallenge = await takeChallenge(env, body.challengeId, 'login', null);
  if (!expectedChallenge) return fail(400, 'Phiên đăng nhập đã hết hạn. Thử lại.');

  const response = body.response as AuthenticationResponseJSON | undefined;
  const credentialId = typeof response?.id === 'string' ? response.id : '';
  const passkey = credentialId
    ? await env.DB.prepare(
        `SELECT p.id, p.public_key, p.counter, p.transports, u.id AS user_id, u.username, u.must_change_password
           FROM passkeys p JOIN users u ON u.id = p.user_id WHERE p.id = ?`
      )
        .bind(credentialId)
        .first<{
          id: string;
          public_key: string;
          counter: number;
          transports: string | null;
          user_id: number;
          username: string;
          must_change_password: number;
        }>()
    : null;

  if (!passkey) {
    await recordLoginFailure(request, env);
    return fail(401, 'Passkey này không thuộc tài khoản nào. Hãy đăng nhập bằng mật khẩu.');
  }

  const { rpID, origin } = relyingParty(request);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: response as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.id,
        publicKey: fromB64url(passkey.public_key),
        counter: passkey.counter,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      },
    });
  } catch {
    verification = null;
  }
  if (!verification?.verified) {
    await recordLoginFailure(request, env);
    return fail(401, 'Không xác minh được passkey.');
  }

  await env.DB.prepare('UPDATE passkeys SET counter = ?, last_used_at = unixepoch() WHERE id = ?')
    .bind(verification.authenticationInfo.newCounter, passkey.id)
    .run();
  await clearLoginFailures(request, env);
  const cookie = await createSession(env, passkey.user_id, request);
  return json(
    200,
    { user: { username: passkey.username, mustChangePassword: passkey.must_change_password === 1 } },
    { 'Set-Cookie': cookie }
  );
};
