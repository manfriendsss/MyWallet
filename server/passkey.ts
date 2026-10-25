import type { Env } from './env';

/** The site a passkey is bound to: the host the request came in on, and its origin */
export function relyingParty(request: Request): { rpID: string; origin: string } {
  const url = new URL(request.url);
  return { rpID: url.hostname, origin: url.origin };
}

const CHALLENGE_TTL_S = 5 * 60;

export function toB64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Store a one-time challenge; returns its id (sent back by the client on verify) */
export async function saveChallenge(env: Env, challenge: string, kind: 'register' | 'login', userId: number | null): Promise<string> {
  const id = toB64url(crypto.getRandomValues(new Uint8Array(18)));
  const now = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').bind(now),
    env.DB.prepare('INSERT INTO webauthn_challenges (id, challenge, user_id, kind, expires_at) VALUES (?, ?, ?, ?, ?)').bind(
      id,
      challenge,
      userId,
      kind,
      now + CHALLENGE_TTL_S
    ),
  ]);
  return id;
}

/** Fetch and delete a challenge in one go: each can be used once, and only before it expires */
export async function takeChallenge(
  env: Env,
  id: unknown,
  kind: 'register' | 'login',
  userId: number | null
): Promise<string | null> {
  if (typeof id !== 'string' || id.length < 10 || id.length > 64) return null;
  const row = await env.DB.prepare('SELECT challenge, user_id, kind, expires_at FROM webauthn_challenges WHERE id = ?')
    .bind(id)
    .first<{ challenge: string; user_id: number | null; kind: string; expires_at: number }>();
  await env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?').bind(id).run();
  if (!row || row.kind !== kind || row.expires_at < Math.floor(Date.now() / 1000)) return null;
  if (userId !== null && row.user_id !== userId) return null;
  return row.challenge;
}
