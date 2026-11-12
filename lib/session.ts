import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { resolveSessionSecret } from "./guards";

const COOKIE = "rocky_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function envAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

export async function createSession(): Promise<string> {
  const secret = resolveSessionSecret();
  if (!secret) throw new Error("SESSION_SECRET");
  const exp = Date.now() + THIRTY_DAYS;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  const token = `${payload}.${sign(payload, secret)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, {
    ...cookieBase(),
    maxAge: THIRTY_DAYS / 1000,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieBase(), maxAge: 0 });
}

/** Cookie HMAC only — never touches Supabase. */
export async function isAuthenticated(): Promise<boolean> {
  const secret = resolveSessionSecret();
  if (!secret) return false;
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts;
  const expected = sign(`${exp}.${nonce}`, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expiresAt = Number(exp);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
