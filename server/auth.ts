import type { Env } from './env';
import { clientIp, fail } from './http';

export const SESSION_COOKIE = '__Host-mw_session';
const SESSION_DAYS = 180; // "remember me": stays signed in, renewed while the app is used
const RENEW_AFTER_S = 24 * 60 * 60;
const PBKDF2_ITERATIONS = 100_000; // the most Cloudflare's runtime allows
export const DEFAULT_PASSWORD = '12345678';

const enc = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);

const toB64 = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Constant-time comparison, so response timing reveals nothing about the hash */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return ['pbkdf2', PBKDF2_ITERATIONS, toB64(salt), toB64(hash)].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iter, saltB64, hashB64] = stored.split('$');
  const iterations = Number(iter);
  if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 1 || !saltB64 || !hashB64) return false;
  const actual = await pbkdf2(password, fromB64(saltB64), iterations);
  return equalBytes(actual, fromB64(hashB64));
}

/** A hash we can verify against when the username is unknown, so both cases cost the same time */
export const DUMMY_HASH = 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'Mật khẩu không hợp lệ.';
  if (password.length < 8) return 'Mật khẩu mới cần ít nhất 8 ký tự.';
  if (password.length > 200) return 'Mật khẩu quá dài.';
  if (password === DEFAULT_PASSWORD) return 'Không dùng lại mật khẩu mặc định.';
  return null;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sessionCookie(token: string, maxAge: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export const clearSessionCookie = () => sessionCookie('', 0);

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

/** Starts a session and returns the Set-Cookie value. Only the token's hash is stored. */
export async function createSession(env: Env, userId: number, request: Request): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const t = now();
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at, last_seen_at, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(await sha256Hex(token), userId, t, t + maxAge, t, (request.headers.get('User-Agent') ?? '').slice(0, 200))
    .run();
  // Housekeeping: drop expired sessions now and then
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(t).run();
  return sessionCookie(token, maxAge);
}

export interface SessionUser {
  id: number;
  username: string;
  mustChangePassword: boolean;
  tokenHash: string;
  /** Set when the session was renewed: send it back so the cookie keeps living */
  renewedCookie?: string;
}

export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length < 20 || token.length > 100) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.user_id AS id, s.expires_at, s.last_seen_at, u.username, u.must_change_password
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first<{ id: number; expires_at: number; last_seen_at: number; username: string; must_change_password: number }>();
  const t = now();
  if (!row || row.expires_at < t) return null;

  const user: SessionUser = {
    id: row.id,
    username: row.username,
    mustChangePassword: row.must_change_password === 1,
    tokenHash,
  };

  // Rolling renewal, at most once a day
  if (t - row.last_seen_at > RENEW_AFTER_S) {
    const maxAge = SESSION_DAYS * 24 * 60 * 60;
    await env.DB.prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
      .bind(t, t + maxAge, tokenHash)
      .run();
    user.renewedCookie = sessionCookie(token, maxAge);
  }
  return user;
}

/**
 * Guard for API routes. Returns the user, or a 401 response.
 * Pass allowPending to let a user who still has the default password through (only the change-password route does).
 */
export async function requireUser(
  request: Request,
  env: Env,
  allowPending = false
): Promise<SessionUser | Response> {
  const user = await getSessionUser(request, env);
  if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.', { 'Set-Cookie': clearSessionCookie() });
  if (user.mustChangePassword && !allowPending) return fail(403, 'Hãy đổi mật khẩu mặc định trước.');
  return user;
}

// --- Login throttling --------------------------------------------------------------

const WINDOW_S = 15 * 60;
const MAX_PER_IP = 8;
const MAX_GLOBAL = 40; // across all IPs, stops slow distributed guessing of the single account

export async function loginBlocked(request: Request, env: Env): Promise<boolean> {
  const since = now() - WINDOW_S;
  const ip = clientIp(request);
  const [perIp, global] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND at > ?').bind(ip, since).first<{ n: number }>(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE at > ?').bind(since).first<{ n: number }>(),
  ]);
  return (perIp?.n ?? 0) >= MAX_PER_IP || (global?.n ?? 0) >= MAX_GLOBAL;
}

export async function recordLoginFailure(request: Request, env: Env): Promise<void> {
  const t = now();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO login_failures (ip, at) VALUES (?, ?)').bind(clientIp(request), t),
    env.DB.prepare('DELETE FROM login_failures WHERE at < ?').bind(t - 24 * 60 * 60),
  ]);
}

export async function clearLoginFailures(request: Request, env: Env): Promise<void> {
  await env.DB.prepare('DELETE FROM login_failures WHERE ip = ?').bind(clientIp(request)).run();
}
