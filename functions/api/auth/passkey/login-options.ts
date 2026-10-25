import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { Ctx } from '../../../../server/env';
import { fail, json, rejectCrossSite } from '../../../../server/http';
import { loginBlocked } from '../../../../server/auth';
import { relyingParty, saveChallenge } from '../../../../server/passkey';

/** Step 1 of signing in with a passkey. Discoverable credentials: the device offers the account itself. */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  if (await loginBlocked(request, env)) return fail(429, 'Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.');

  const { rpID } = relyingParty(request);
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
  const challengeId = await saveChallenge(env, options.challenge, 'login', null);
  return json(200, { options, challengeId });
};
