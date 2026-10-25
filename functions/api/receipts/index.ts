import type { Ctx } from '../../../server/env';
import { fail, json } from '../../../server/http';
import { requireUser } from '../../../server/auth';

const MAX_BYTES = 3 * 1024 * 1024; // the app sends a WebP already shrunk to 1600px
const TYPES: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

/** Store a receipt photo: POST the image bytes, get back the key to keep on the transaction */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return fail(403, 'Yêu cầu không hợp lệ.');

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const type = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return fail(415, 'Chỉ nhận ảnh WebP, JPEG hoặc PNG.');

  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BYTES) return fail(413, 'Ảnh quá lớn.');
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return fail(413, 'Ảnh quá lớn.');

  // Check the file really is the image type it claims (magic bytes), not just the header
  const head = new Uint8Array(bytes.slice(0, 12));
  const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45;
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  if (!(ext === 'webp' ? isWebp : ext === 'jpg' ? isJpeg : isPng)) return fail(415, 'Tệp không phải ảnh hợp lệ.');

  // Keys are scoped to the owner, so the read route can check ownership from the key alone
  const random = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `u${user.id}/${new Date().toISOString().slice(0, 7)}/${random}.${ext}`;
  await env.RECEIPTS.put(key, bytes, { httpMetadata: { contentType: type } });

  return json(201, { key });
};
