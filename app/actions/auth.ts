"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { classifyDbError } from "@/lib/admin-errors";
import { adminExists, createSession, destroySession, hashPassword, passwordMatches } from "@/lib/auth";
import { MAX_PASSWORD_LENGTH, PUBLISHED_DEFAULT_PASSWORD, resolveSessionSecret, safeEqual } from "@/lib/guards";
import { allowRate, ipFromHeaders } from "@/lib/rate-limit";
import { getAdminRecord, saveAdminRecord } from "@/lib/store";

async function requestIp(): Promise<string> {
  return ipFromHeaders(await headers());
}

export async function setupAdmin(formData: FormData) {
  if (!(await allowRate(`setup:${await requestIp()}`, 8, 60 * 60 * 1000))) {
    redirect("/admin/setup?error=rate");
  }
  if (!resolveSessionSecret()) {
    redirect("/admin/setup?error=session");
  }
  if (await adminExists()) {
    redirect("/admin/login");
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    redirect("/admin/setup?error=short");
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    redirect("/admin/setup?error=long");
  }
  if (safeEqual(password, PUBLISHED_DEFAULT_PASSWORD)) {
    redirect("/admin/setup?error=weak");
  }
  if (password !== confirm) {
    redirect("/admin/setup?error=mismatch");
  }
  try {
    await saveAdminRecord({
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    redirect(`/admin/setup?error=${classifyDbError(error).code}`);
  }
  await createSession();
  redirect("/admin");
}

export async function loginAdmin(formData: FormData) {
  if (!(await allowRate(`login:${await requestIp()}`, 10, 10 * 60 * 1000))) {
    redirect("/admin/login?error=rate");
  }
  if (!resolveSessionSecret()) {
    redirect("/admin/login?error=session");
  }
  const password = String(formData.get("password") ?? "");
  if (passwordMatches(password, null)) {
    await createSession();
    redirect("/admin");
  }
  let hash: string | null = null;
  try {
    hash = (await getAdminRecord())?.passwordHash ?? null;
  } catch (error) {
    redirect(`/admin/login?error=${classifyDbError(error).code}`);
  }
  if (!passwordMatches(password, hash)) {
    redirect("/admin/login?error=invalid");
  }
  await createSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await destroySession();
  redirect("/admin/login");
}
