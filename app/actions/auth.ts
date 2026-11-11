"use server";

import { redirect } from "next/navigation";
import { classifyDbError } from "@/lib/admin-errors";
import { adminExists, createSession, destroySession, hashPassword, passwordMatches } from "@/lib/auth";
import { getAdminRecord, saveAdminRecord } from "@/lib/store";

export async function setupAdmin(formData: FormData) {
  if (await adminExists()) {
    redirect("/admin/login");
  }
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    redirect("/admin/setup?error=short");
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
