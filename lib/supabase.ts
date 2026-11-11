import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Abort hung PostgREST calls instead of waiting for the ~14s platform timeout. */
export const SUPABASE_FETCH_MS = 2000;
/** First contact / NXDOMAIN / connect: do not wait out resolver or 12s write budget. */
export const SUPABASE_CONNECT_MS = 1500;
export const PUBLIC_DATA_TAG = "rocky-public";

const UNREACHABLE_TTL_MS = 60_000;

let reachable: boolean | null = null;
let unreachableUntil = 0;

export function supabaseUnreachable(): boolean {
  return reachable === false && Date.now() < unreachableUntil;
}

function markReachable(): void {
  reachable = true;
  unreachableUntil = 0;
}

function markUnreachable(): void {
  reachable = false;
  unreachableUntil = Date.now() + UNREACHABLE_TTL_MS;
}

function attemptTimeout(requestedMs: number): number {
  if (reachable === true) return requestedMs;
  return Math.min(requestedMs, SUPABASE_CONNECT_MS);
}

function isNetworkFailure(error: unknown): boolean {
  const err = error as { name?: string; code?: string; message?: string; cause?: { code?: string; name?: string } };
  const code = String(err?.code || err?.cause?.code || "");
  const name = String(err?.name || err?.cause?.name || "");
  const message = String(err?.message || "");
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "ENETUNREACH" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_DNS" ||
    /fetch failed|aborted|ENOTFOUND|undici|timeout/i.test(message)
  );
}

const unreachableError = () => new Error("supabase unreachable");

function supabaseFetch(kind: "public" | "admin", timeoutMs = SUPABASE_FETCH_MS): typeof fetch {
  return (input, init) => {
    if (supabaseUnreachable()) return Promise.reject(unreachableError());
    const controller = new AbortController();
    const budget = attemptTimeout(timeoutMs);
    const timer = setTimeout(() => controller.abort(), budget);
    const parent = init?.signal;
    if (parent) {
      if (parent.aborted) controller.abort(parent.reason);
      else parent.addEventListener("abort", () => controller.abort(parent.reason), { once: true });
    }
    const method = String(init?.method || "GET").toUpperCase();
    const cacheOpts =
      kind === "public" && method === "GET"
        ? { next: { revalidate: 60, tags: [PUBLIC_DATA_TAG] } }
        : { cache: "no-store" as const };
    return fetch(input, {
      ...init,
      ...cacheOpts,
      signal: controller.signal,
    } as RequestInit)
      .then((res) => {
        markReachable();
        return res;
      })
      .catch((error) => {
        if (reachable !== true && isNetworkFailure(error)) markUnreachable();
        throw error;
      })
      .finally(() => clearTimeout(timer));
  };
}

export async function failSoft<T>(work: PromiseLike<T>, fallback: T, ms = SUPABASE_FETCH_MS + 400): Promise<T> {
  if (supabaseUnreachable()) return fallback;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = reachable === true ? ms : Math.min(ms, SUPABASE_CONNECT_MS + 400);
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("supabase timeout")), budget);
      }),
    ]);
  } catch (error) {
    if (reachable !== true && isNetworkFailure(error)) markUnreachable();
    console.error("supabase fail-soft", error);
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function firstEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

/** True on Vercel / other read-only serverless filesystems. */
export function isReadOnlyRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function supabaseUrl(): string {
  return firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL").replace(/\/$/, "");
}

/**
 * Public/low-privilege key: legacy JWT `eyJ…` (anon) or `sb_publishable_…`.
 * Also reads the dashboard’s newer env names.
 */
export function supabaseAnonKey(): string {
  return firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
  );
}

/**
 * Server key: legacy JWT `eyJ…` (service_role) or `sb_secret_…`.
 */
export function supabaseSecretKey(): string {
  return firstEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY");
}

/** Prefer Supabase whenever the project URL is set — never JSON files on Vercel. */
export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl());
}

export function supabaseAdminConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseSecretKey());
}

export function supabaseAnonConfigured(): boolean {
  return Boolean(supabaseUrl() && supabaseAnonKey());
}

const adminClients = new Map<number, SupabaseClient>();

export function supabaseAdmin(timeoutMs = SUPABASE_FETCH_MS): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseSecretKey();
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  const cached = adminClients.get(timeoutMs);
  if (cached) return cached;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch("admin", timeoutMs) },
  });
  adminClients.set(timeoutMs, client);
  return client;
}

/** Anon/publishable client: RLS applies. Public pages use this to read published cars and settings. */
export function supabasePublic(): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseAnonKey() || supabaseSecretKey();
  if (!url || !key) {
    throw new Error("Supabase anon key is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: supabaseFetch("public") },
  });
}
