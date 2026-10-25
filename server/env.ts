// Minimal Cloudflare types used by the Pages Functions (keeps the project free of @cloudflare/workers-types)

export interface D1Result<T> {
  results: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  size: number;
}

export interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
}

export interface Env {
  DB: D1Database;
  RECEIPTS: R2Bucket;
  GEMINI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
}

export interface Ctx<P extends string = string> {
  request: Request;
  env: Env;
  params: Record<P, string | string[]>;
}
