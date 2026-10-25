import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { Ctx } from '../../../../server/env';
import { json, rejectCrossSite } from '../../../../server/http';
import { requireUser } from '../../../../server/auth';
import { relyingParty, saveChallenge } from '../../../../server/passkey';

/** Step 1 of adding a passkey: only a signed-in user can add one to their own account */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const { results } = await env.DB.prepare('SELECT id, transports FROM passkeys WHERE user_id = ?')
    .bind(user.id)
    .all<{ id: string; transports: string | null }>();

  const { rpID } = relyingParty(request);
  const options = await generateRegistrationOptions({
    rpName: 'MyWallet',
    rpID,
    userName: user.username,
    userDisplayName: user.username,
    userID: new TextEncoder().encode(`mywallet-user-${user.id}`),
    attestationType: 'none',
    // The same authenticator cannot be added twice
    excludeCredentials: results.map((p) => ({
      id: p.id,
      transports: p.transports ? JSON.parse(p.transports) : undefined,
    })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });

  const challengeId = await saveChallenge(env, options.challenge, 'register', user.id);
  return json(200, { options, challengeId });
};
