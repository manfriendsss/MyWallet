/**
 * Cloudflare Pages Function: POST /api/ai/gemini and /api/ai/deepseek
 *
 * The AI keys live here as encrypted Cloudflare secrets and never reach the browser.
 * Every request must carry a valid Cloudflare Access login (a signed JWT); the email in it must be on
 * ALLOWED_EMAILS. Without that the function refuses, so a leaked URL cannot spend your quota.
 *
 * Secrets / variables (Pages > Settings > Variables and Secrets, or `wrangler pages secret put`):
 *   GEMINI_API_KEY      secret
 *   DEEPSEEK_API_KEY    secret
 *   ACCESS_TEAM_DOMAIN  e.g. "yourteam.cloudflareaccess.com"
 *   ACCESS_AUD          the Application Audience (AUD) tag of the Access application
 *   ALLOWED_EMAILS      comma separated, e.g. "you@gmail.com"
 */

interface Env {
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  ALLOWED_EMAILS?: string;
}

interface Ctx {
  request: Request;
  env: Env;
  params: { provider?: string | string[] };
}

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];
const DEEPSEEK_MODELS = ['deepseek-flash', 'deepseek-v4-pro'];
const MAX_BODY_BYTES = 6 * 1024 * 1024; // a compressed receipt photo plus the prompt
const UPSTREAM_TIMEOUT_MS = 30_000;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const fail = (status: number, message: string) => json(status, { error: { message } });

// --- Cloudflare Access JWT verification --------------------------------------

type Jwk = JsonWebKey & { kid?: string };
let certCache: { keys: Jwk[]; at: number } | null = null;

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function accessKeys(team: string): Promise<Jwk[]> {
  if (certCache && Date.now() - certCache.at < 60 * 60 * 1000) return certCache.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('certs unavailable');
  const data = (await res.json()) as { keys?: Jwk[] };
  certCache = { keys: data.keys ?? [], at: Date.now() };
  return certCache.keys;
}

/** Returns the signed-in email, or null when the token is missing, forged, expired or for another app */
async function verifyAccess(request: Request, env: Env): Promise<string | null> {
  const team = env.ACCESS_TEAM_DOMAIN?.trim();
  const aud = env.ACCESS_AUD?.trim();
  if (!team || !aud) return null;

  const token =
    request.headers.get('Cf-Access-Jwt-Assertion') ??
    /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(request.headers.get('Cookie') ?? '')?.[1];
  if (!token) return null;

  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) return null;

  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (header.alg !== 'RS256') return null;

    const jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;

    const now = Math.floor(Date.now() / 1000);
    const audiences: string[] = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(aud)) return null;
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    if (typeof payload.nbf === 'number' && payload.nbf > now + 60) return null;
    if (payload.iss !== `https://${team}`) return null;

    return typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
}

// --- Request shaping: forward only what the app needs ----------------------------

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]])) as Partial<T>;
}

async function callUpstream(url: string, headers: Record<string, string>, body: unknown): Promise<Response> {
  const upstream = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  // Pass the provider's JSON and status through, without its headers
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const onRequestPost = async ({ request, env, params }: Ctx): Promise<Response> => {
  // Same-origin only: the app on this domain, never another site
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return fail(403, 'Origin not allowed');

  const email = await verifyAccess(request, env);
  const allowed = (env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!email || allowed.length === 0 || !allowed.includes(email)) {
    return fail(401, 'Cần đăng nhập Cloudflare Access bằng email được phép.');
  }

  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) return fail(413, 'Yêu cầu quá lớn.');

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, 'Yêu cầu quá lớn.');
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
  } catch {
    return fail(400, 'Dữ liệu gửi lên không hợp lệ.');
  }

  const provider = Array.isArray(params.provider) ? params.provider[0] : params.provider;

  try {
    if (provider === 'gemini') {
      if (!env.GEMINI_API_KEY) return fail(503, 'Máy chủ chưa có GEMINI_API_KEY.');
      const model = typeof body.model === 'string' && GEMINI_MODELS.includes(body.model) ? body.model : GEMINI_MODELS[0];
      return await callUpstream(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': env.GEMINI_API_KEY },
        pick(body, ['contents', 'systemInstruction', 'generationConfig'])
      );
    }

    if (provider === 'deepseek') {
      if (!env.DEEPSEEK_API_KEY) return fail(503, 'Máy chủ chưa có DEEPSEEK_API_KEY.');
      const model = typeof body.model === 'string' && DEEPSEEK_MODELS.includes(body.model) ? body.model : DEEPSEEK_MODELS[0];
      return await callUpstream(
        'https://api.deepseek.com/chat/completions',
        { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        { ...pick(body, ['messages', 'temperature', 'max_tokens']), model, stream: false }
      );
    }
  } catch {
    return fail(504, 'Nhà cung cấp AI không phản hồi.');
  }

  return fail(404, 'Không có nhà cung cấp này.');
};

export const onRequest = async (): Promise<Response> => fail(405, 'Chỉ nhận POST.');
