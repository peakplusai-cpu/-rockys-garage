"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { uid } from "@/lib/id";
import { resolveLineUrl } from "@/lib/line";
import { getStore, saveStore } from "@/lib/store";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function upsertStaff(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const lineId = String(formData.get("lineId") ?? "").trim();
  const lineUrlRaw = String(formData.get("lineUrl") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  if (!lineId && !lineUrlRaw) {
    redirect("/admin/staff?error=line");
  }
  const lineUrl = resolveLineUrl(lineUrlRaw, lineId);
  const store = await getStore();
  const existing = store.staff.find((person) => person.id === id);
  if (existing) {
    existing.displayName = displayName;
    existing.role = role;
    existing.lineId = lineId;
    existing.lineUrl = lineUrl;
    existing.note = note;
    existing.sortOrder = sortOrder || existing.sortOrder;
  } else {
    store.staff.push({
      id: uid("st"),
      displayName,
      role,
      lineId,
      lineUrl,
      note,
      lineUserId: "",
      sortOrder: sortOrder || store.staff.length + 1,
      createdAt: new Date().toISOString(),
    });
  }
  await saveStore(store);
  revalidatePublic(["/admin/staff"]);
  redirect("/admin/staff");
}

export async function deleteStaff(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  store.staff = store.staff.filter((person) => person.id !== id);
  await saveStore(store);
  revalidatePublic(["/admin/staff"]);
}
