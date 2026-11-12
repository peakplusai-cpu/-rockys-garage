import { createHmac, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { resolveSessionSecret, safeEqual } from "./guards";

const COOKIE = "rocky_line_oauth";
const MAX_AGE_SECONDS = 10 * 60;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api/line",
    maxAge: MAX_AGE_SECONDS,
  };
}

/** Signed, short-lived state bound to this browser. Returns null when the session secret is unusable. */
export async function issueLineOauthState(staffId: string): Promise<string | null> {
  const secret = resolveSessionSecret();
  if (!secret || !/^[A-Za-z0-9_-]{1,80}$/.test(staffId)) return null;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${staffId}.${nonce}`;
  const token = `${payload}.${sign(payload, secret)}`;
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions());
  return token;
}

/** Returns the staff id only when the query state matches the cookie and the signature. */
export async function consumeLineOauthState(stateParam: string): Promise<string | null> {
  const secret = resolveSessionSecret();
  const jar = await cookies();
  const cookie = jar.get(COOKIE)?.value ?? "";
  jar.set(COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  if (!secret || !cookie || !stateParam || !safeEqual(cookie, stateParam)) return null;
  const parts = cookie.split(".");
  if (parts.length !== 3) return null;
  const [staffId, nonce, mac] = parts;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(staffId) || !nonce) return null;
  if (!safeEqual(mac, sign(`${staffId}.${nonce}`, secret))) return null;
  return staffId;
}
