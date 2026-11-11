import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession, envAdminPassword, isAuthenticated } from "./session";
import { getStore } from "./store";

export { hashPassword, verifyPassword, createSession, destroySession, envAdminPassword, isAuthenticated };

export async function adminExists(): Promise<boolean> {
  if (envAdminPassword()) return true;
  const store = await getStore();
  return Boolean(store.admin);
}

export function passwordMatches(password: string, storedHash?: string | null): boolean {
  const envPass = envAdminPassword();
  if (envPass && password === envPass) return true;
  if (storedHash && verifyPassword(password, storedHash)) return true;
  return false;
}

/** Cookie check only. Call before any desk Supabase read so RSC can 307 without waiting on PostgREST. */
export async function requireDeskAuth(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}
