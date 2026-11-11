"use server";

import { redirect } from "next/navigation";
import { adminExists, createSession, destroySession, hashPassword, passwordMatches } from "@/lib/auth";
import { getStore, saveStore } from "@/lib/store";

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
  const store = await getStore();
  store.admin = {
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await saveStore(store);
  await createSession();
  redirect("/admin");
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (passwordMatches(password, null)) {
    await createSession();
    redirect("/admin");
  }
  const store = await getStore();
  if (!passwordMatches(password, store.admin?.passwordHash)) {
    redirect("/admin/login?error=invalid");
  }
  await createSession();
  redirect("/admin");
}

export async function logoutAdmin() {
  await destroySession();
  redirect("/admin/login");
}
