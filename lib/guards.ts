import { timingSafeEqual } from "crypto";

/** Reject oversized passwords before they reach scrypt. */
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Password shipped in the old example env and README.
 * Production must not accept it, even when it matches a stored hash or ADMIN_PASSWORD.
 */
export const PUBLISHED_DEFAULT_PASSWORD = "rocky-admin-2026";

const INSECURE_SESSION_SECRETS = new Set([
  "rockys-garage-local-session",
  "change-me-in-production",
]);

const DEV_SESSION_SECRET = "rockys-garage-local-session";

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Production refuses missing or publicly known session secrets. Development may use the local fallback. */
export function resolveSessionSecret(): string | null {
  const configured = process.env.SESSION_SECRET?.trim() ?? "";
  if (process.env.NODE_ENV !== "production") {
    return configured || DEV_SESSION_SECRET;
  }
  if (!configured || INSECURE_SESSION_SECRETS.has(configured)) return null;
  return configured;
}

export function isBlockedAdminPassword(password: string): boolean {
  return process.env.NODE_ENV === "production" && safeEqual(password, PUBLISHED_DEFAULT_PASSWORD);
}

/** http(s) or a same-site upload/hero path. Blocks javascript:, data:, and path traversal. */
export function safeImageUrl(value: string): string {
  const raw = value.trim();
  if (!raw || raw.length > 2000) return "";
  if (raw.startsWith("/")) {
    if (!/^\/(?:uploads|hero)\/[A-Za-z0-9._-]+$/.test(raw)) return "";
    return raw;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (url.username || url.password) return "";
  return url.href;
}

export function appOrigin(requestUrl: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "";
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* Use the incoming request when the configured site URL is not a URL. */
    }
  }
  return new URL(requestUrl).origin;
}

/** Build a redirect on our own origin. Ignores protocol-relative and off-site paths. */
export function sameOriginPath(requestUrl: string, path: string): URL {
  const safePath = path.startsWith("/") && !path.startsWith("//") ? path : "/admin";
  return new URL(safePath, appOrigin(requestUrl));
}

/** JSON for a script tag. Escapes characters that can break out of the element. */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
