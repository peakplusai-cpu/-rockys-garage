"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { classifyDbError, isRedirectError } from "@/lib/admin-errors";
import { isAuthenticated } from "@/lib/auth";
import { uid } from "@/lib/id";
import { resolveLineUrl } from "@/lib/line";
import { listAdminStaff, removeStaff, saveStaff } from "@/lib/store";

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
  try {
    const staff = await listAdminStaff();
    const existing = staff.find((person) => person.id === id);
    await saveStaff(
      existing
        ? {
            ...existing,
            displayName,
            role,
            lineId,
            lineUrl,
            note,
            sortOrder: sortOrder || existing.sortOrder,
          }
        : {
            id: uid("st"),
            displayName,
            role,
            lineId,
            lineUrl,
            note,
            lineUserId: "",
            sortOrder: sortOrder || staff.length + 1,
            createdAt: new Date().toISOString(),
          }
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("upsertStaff", error);
    redirect(`/admin/staff?error=${classifyDbError(error).code}`);
  }
  revalidatePublic(["/admin/staff"]);
  redirect("/admin/staff?saved=1");
}

export async function deleteStaff(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  try {
    await removeStaff(id);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("deleteStaff", error);
    redirect(`/admin/staff?error=${classifyDbError(error).code}`);
  }
  revalidatePublic(["/admin/staff"]);
  redirect("/admin/staff?saved=1");
}
