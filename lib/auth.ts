import { redirect } from "next/navigation";
import { isBlockedAdminPassword, MAX_PASSWORD_LENGTH, safeEqual } from "./guards";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, envAdminPassword, isAuthenticated } from "./session";
import { getAdminRecord } from "./store";

export { hashPassword, verifyPassword, createSession, destroySession, envAdminPassword, isAuthenticated };

/**
 * When the database cannot be read we answer "yes, an admin exists": the login page then shows the
 * real error instead of inviting someone to create a new password against an unreadable database.
 */
export async function adminExists(): Promise<boolean> {
  if (envAdminPassword()) return true;
  try {
    return Boolean(await getAdminRecord());
  } catch {
    return true;
  }
}

export function passwordMatches(password: string, storedHash?: string | null): boolean {
  if (!password || password.length > MAX_PASSWORD_LENGTH) return false;
  if (isBlockedAdminPassword(password)) return false;
  const envPass = envAdminPassword();
  if (envPass && safeEqual(password, envPass)) return true;
  if (storedHash && verifyPassword(password, storedHash)) return true;
  return false;
}

/** Cookie check only. Call before any desk Supabase read so RSC can 307 without waiting on PostgREST. */
export async function requireDeskAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}
