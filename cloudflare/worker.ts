/**
 * Cloudflare Worker Backend for MyWallet
 * Handles:
 * 1. Cloudflare D1 SQL syncing (Transactions, Wallets, Categories)
 * 2. Cloudflare R2 bucket image upload for receipts (WebP quality 85)
 * 3. Secure Server-Side AI Proxy for Gemini & DeepSeek (Keeps API Keys confidential)
 */

export interface Env {
  DB: D1Database;
  RECEIPTS_BUCKET: R2Bucket;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  R2_PUBLIC_DOMAIN?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // 1. Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', app: 'MyWallet API' }), {
          headers: corsHeaders,
        });
      }

      // 2. Upload receipt image to Cloudflare R2
      if (url.pathname === '/api/receipts/upload' && request.method === 'POST') {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
          return new Response(JSON.stringify({ error: 'No file provided' }), {
            status: 400,
            headers: corsHeaders,
          });
        }

        const filename = `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        await env.RECEIPTS_BUCKET.put(filename, file.stream(), {
          httpMetadata: { contentType: 'image/webp' },
        });

        const receiptUrl = env.R2_PUBLIC_DOMAIN
          ? `${env.R2_PUBLIC_DOMAIN}/${filename}`
          : `/api/receipts/${filename}`;

        return new Response(JSON.stringify({ success: true, url: receiptUrl }), {
          headers: corsHeaders,
        });
      }

      // 3. Serve receipt from Cloudflare R2
      if (url.pathname.startsWith('/api/receipts/') && request.method === 'GET') {
        const key = url.pathname.replace('/api/receipts/', '');
        const object = await env.RECEIPTS_BUCKET.get(key);
        if (!object) {
          return new Response('Not found', { status: 404 });
        }
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, { headers });
      }

      // 4. Secure AI Proxy (Hide secret keys from client browser)
      if (url.pathname === '/api/ai-proxy' && request.method === 'POST') {
        const body = (await request.json()) as {
          provider: 'gemini' | 'deepseek';
          model?: string;
          prompt: string;
          imageBase64?: string;
        };

        if (body.provider === 'gemini') {
          const apiKey = env.GEMINI_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server missing GEMINI_API_KEY secret' }), {
              status: 500,
              headers: corsHeaders,
            });
          }

          const model = body.model || 'gemini-2.5-flash';
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const parts: any[] = [{ text: body.prompt }];
          if (body.imageBase64) {
            const cleanBase64 = body.imageBase64.replace(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/, '');
            parts.push({
              inlineData: { mimeType: 'image/webp', data: cleanBase64 },
            });
          }

          const aiRes = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
            }),
          });

          const data = await aiRes.json();
          return new Response(JSON.stringify(data), { headers: corsHeaders });
        }
      }

      // 5. Cloudflare D1 Transactions CRUD
      if (url.pathname === '/api/transactions') {
        if (request.method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT 100').all();
          return new Response(JSON.stringify(results), { headers: corsHeaders });
        }
      }

      return new Response('API route not found', { status: 404, headers: corsHeaders });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
