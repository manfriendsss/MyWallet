/**
 * POST /api/ai/gemini and /api/ai/deepseek
 *
 * The AI keys live here as encrypted Cloudflare secrets (GEMINI_API_KEY, DEEPSEEK_API_KEY) and never
 * reach the browser. Only a signed-in user (app session cookie) who has changed the default password may call.
 */
import type { Ctx } from '../../../server/env';
import { fail, readJson, rejectCrossSite } from '../../../server/http';
import { requireUser } from '../../../server/auth';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash'];
const DEEPSEEK_MODELS = ['deepseek-flash', 'deepseek-v4-pro'];
const MAX_BODY_BYTES = 6 * 1024 * 1024; // a compressed receipt photo plus the prompt
// Under the app's own 25 s wait, so a stuck model comes back as a clean 504 and the app moves to the next one
const UPSTREAM_TIMEOUT_MS = 20_000;

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

export const onRequestPost = async ({ request, env, params }: Ctx<'provider'>): Promise<Response> => {
  const bad = rejectCrossSite(request);
  if (bad) return bad;

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await readJson(request, MAX_BODY_BYTES);
  if (body instanceof Response) return body;

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
        {
          ...pick(body, ['messages', 'temperature', 'max_tokens']),
          // V4.1 Flash thinks by default; the app turns it off for short, fast classification
          thinking: { type: (body.thinking as { type?: string } | undefined)?.type === 'enabled' ? 'enabled' : 'disabled' },
          model,
          stream: false,
        }
      );
    }
  } catch {
    return fail(504, 'Nhà cung cấp AI không phản hồi.');
  }

  return fail(404, 'Không có nhà cung cấp này.');
};

export const onRequest = async (): Promise<Response> => fail(405, 'Chỉ nhận POST.');
