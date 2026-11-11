import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AdminErrorCode } from "./admin-errors";

/** Must match hosted Supabase projects — rejects Vercel URLs and typos early. */
const SUPABASE_PROJECT_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

/** Abort hung PostgREST calls instead of waiting for the ~14s platform timeout. */
export const SUPABASE_FETCH_MS = 2000;
/** Admin reads/writes must not be cut short by the public fail-soft budget. */
export const ADMIN_FETCH_MS = 8000;
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

function isHtmlContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return ct.includes("text/html") || ct.includes("application/xhtml");
}

/** One-line public read errors — never log HTML bodies. */
export function logSupabasePublic(scope: string, error: unknown): void {
  const raw = error instanceof Error ? error.message : String(error ?? "unknown");
  if (/<!doctype|<html/i.test(raw) || raw.length > 160) {
    console.error(`supabase ${scope}: non-json response (check NEXT_PUBLIC_SUPABASE_URL and rocky_* tables)`);
    return;
  }
  console.error(`supabase ${scope}:`, raw.slice(0, 160));
}

function supabaseFetch(kind: "public" | "admin", timeoutMs = SUPABASE_FETCH_MS): typeof fetch {
  return (input, init) => {
    const admin = kind === "admin";
    // Admin writes ignore the public "unreachable" latch so a past blip cannot silently drop a save.
    if (!admin && supabaseUnreachable()) return Promise.reject(unreachableError());
    const controller = new AbortController();
    const budget = admin ? timeoutMs : attemptTimeout(timeoutMs);
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
        const ct = res.headers.get("content-type") || "";
        if (isHtmlContentType(ct)) {
          markUnreachable();
          throw new Error("supabase html response");
        }
        markReachable();
        return res;
      })
      .catch((error) => {
        if (reachable !== true && isNetworkFailure(error)) markUnreachable();
        if (reachable !== true && error instanceof Error && error.message === "supabase html response") {
          markUnreachable();
        }
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
    if (error instanceof Error && error.message === "supabase html response") markUnreachable();
    logSupabasePublic("fail-soft", error);
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

/** Accepts the project URL as pasted: quotes, trailing path (/rest/v1), or the dashboard URL containing the project ref. */
export function normalizeSupabaseUrl(input: string): string {
  let value = input.trim().replace(/^["']+|["']+$/g, "");
  if (/^[a-z0-9-]+\.supabase\.co(?:[/?#]|$)/i.test(value)) value = `https://${value}`;
  const host = /^https:\/\/([a-z0-9-]+)\.supabase\.co(?:[/?#].*)?$/i.exec(value);
  if (host) return `https://${host[1].toLowerCase()}.supabase.co`;
  const dashboard = /^https:\/\/(?:app\.)?supabase\.com\/dashboard\/project\/([a-z0-9]{20})(?:[/?#].*)?$/i.exec(value);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;
  return value.replace(/\/$/, "");
}

export function supabaseUrlRaw(): string {
  return normalizeSupabaseUrl(firstEnv("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"));
}

export function isValidSupabaseProjectUrl(url: string): boolean {
  return Boolean(url && SUPABASE_PROJECT_URL.test(url));
}

let warnedBadUrl = false;

export function supabaseUrl(): string {
  const raw = supabaseUrlRaw();
  if (!isValidSupabaseProjectUrl(raw)) {
    if (raw && !warnedBadUrl) {
      warnedBadUrl = true;
      logSupabasePublic("config", "ignored invalid NEXT_PUBLIC_SUPABASE_URL");
    }
    return "";
  }
  return raw;
}

export type KeyKind = "none" | "service" | "anon" | "unknown";

/** Classify a key by prefix / JWT role without ever exposing the value. */
export function classifyKey(key: string): KeyKind {
  if (!key) return "none";
  if (key.startsWith("sb_secret_")) return "service";
  if (key.startsWith("sb_publishable_")) return "anon";
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { role?: string };
      if (payload.role === "service_role") return "service";
      if (payload.role === "anon") return "anon";
    } catch {
      return "unknown";
    }
  }
  return "unknown";
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
  const candidates = ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_KEY"]
    .map((name) => process.env[name]?.trim() || "")
    .filter(Boolean);
  return candidates.find((key) => classifyKey(key) === "service") ?? candidates[0] ?? "";
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

export function supabaseAdmin(timeoutMs = ADMIN_FETCH_MS): SupabaseClient {
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

export type SupabaseEnvReport = {
  urlSet: boolean;
  urlValid: boolean;
  urlHost: string;
  anonKey: KeyKind;
  serviceKey: KeyKind;
  readOnlyRuntime: boolean;
};

/** Env-only snapshot (no network, no secrets). */
export function supabaseEnvReport(): SupabaseEnvReport {
  const raw = supabaseUrlRaw();
  const valid = isValidSupabaseProjectUrl(raw);
  return {
    urlSet: Boolean(raw),
    urlValid: valid,
    urlHost: valid ? raw.replace(/^https:\/\//, "") : "",
    anonKey: classifyKey(supabaseAnonKey()),
    serviceKey: classifyKey(supabaseSecretKey()),
    readOnlyRuntime: isReadOnlyRuntime(),
  };
}

/**
 * Why admin writes cannot reach Supabase right now, or null when they can.
 * No URL on a writable local disk is allowed (JSON file mode) — never on Vercel.
 */
export function supabaseWriteBlocker(): AdminErrorCode | null {
  const env = supabaseEnvReport();
  if (!env.urlSet) return env.readOnlyRuntime ? "no_url" : null;
  if (!env.urlValid) return "bad_url";
  if (env.serviceKey === "none") return "no_key";
  if (env.serviceKey === "anon") return "wrong_key";
  return null;
}

/** Public reads that must not be cached when they fail: throws instead of returning a fallback. */
export async function withTimeout<T>(work: PromiseLike<T>, ms = SUPABASE_FETCH_MS + 400): Promise<T> {
  if (supabaseUnreachable()) throw unreachableError();
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
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
