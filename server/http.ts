export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });

export const fail = (status: number, message: string, headers: Record<string, string> = {}) =>
  json(status, { error: { message } }, headers);

/**
 * Writes must come from this site: same Origin, and JSON (which a plain HTML form cannot send).
 * Together with SameSite=Lax cookies this closes cross-site request forgery.
 */
export function rejectCrossSite(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return fail(403, 'Yêu cầu không hợp lệ.');
  const type = request.headers.get('Content-Type') ?? '';
  if (request.method !== 'GET' && !type.toLowerCase().startsWith('application/json')) {
    return fail(415, 'Yêu cầu không hợp lệ.');
  }
  return null;
}

/** Parse a JSON object body with a size cap */
export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | Response> {
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > maxBytes) return fail(413, 'Dữ liệu quá lớn.');
  const text = await request.text();
  if (text.length > maxBytes) return fail(413, 'Dữ liệu quá lớn.');
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    return fail(400, 'Dữ liệu gửi lên không hợp lệ.');
  }
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';
}
