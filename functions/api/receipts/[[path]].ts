import type { Ctx } from '../../../server/env';
import { fail, json } from '../../../server/http';
import { requireUser } from '../../../server/auth';

/** u<id>/<yyyy-mm>/<hex>.<ext>, and nothing else: no "..", no other user's folder */
const KEY_PATTERN = /^u(\d+)\/\d{4}-\d{2}\/[0-9a-f]{24}\.(webp|jpg|png)$/;

function ownedKey(params: Record<string, string | string[]>, userId: number): string | null {
  const parts = params.path;
  const key = Array.isArray(parts) ? parts.join('/') : parts;
  const match = typeof key === 'string' ? KEY_PATTERN.exec(key) : null;
  return match && Number(match[1]) === userId ? key : null;
}

/** View a receipt: only its owner, never cached by shared caches */
export const onRequestGet = async ({ request, env, params }: Ctx<'path'>): Promise<Response> => {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const key = ownedKey(params, user.id);
  if (!key) return fail(404, 'Không tìm thấy ảnh.');

  const object = await env.RECEIPTS.get(key);
  if (!object) return fail(404, 'Không tìm thấy ảnh.');
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/webp',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    },
  });
};

/** Remove a receipt photo */
export const onRequestDelete = async ({ request, env, params }: Ctx<'path'>): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return fail(403, 'Yêu cầu không hợp lệ.');
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  const key = ownedKey(params, user.id);
  if (!key) return fail(404, 'Không tìm thấy ảnh.');
  await env.RECEIPTS.delete(key);
  return json(200, { ok: true });
};
