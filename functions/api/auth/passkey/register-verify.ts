import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server';
import type { Ctx } from '../../../../server/env';
import { fail, json, readJson, rejectCrossSite } from '../../../../server/http';
import { requireUser } from '../../../../server/auth';
import { relyingParty, takeChallenge, toB64url } from '../../../../server/passkey';

/** Step 2 of adding a passkey: check the authenticator's answer and store its public key */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await readJson(request, 20_000);
  if (body instanceof Response) return body;

  const expectedChallenge = await takeChallenge(env, body.challengeId, 'register', user.id);
  if (!expectedChallenge) return fail(400, 'Phiên thêm passkey đã hết hạn. Thử lại.');

  const { rpID, origin } = relyingParty(request);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return fail(400, 'Không xác minh được passkey.');
  }
  if (!verification.verified) return fail(400, 'Không xác minh được passkey.');

  const { credential } = verification.registrationInfo;
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : null;
  await env.DB.prepare(
    'INSERT INTO passkeys (id, user_id, public_key, counter, transports, name) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(
      credential.id,
      user.id,
      toB64url(credential.publicKey),
      credential.counter,
      credential.transports ? JSON.stringify(credential.transports) : null,
      name || null
    )
    .run();

  return json(200, { ok: true });
};
