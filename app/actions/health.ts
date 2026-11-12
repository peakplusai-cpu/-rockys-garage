"use server";

import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { runWriteProbe } from "@/lib/health";

export async function runHealthWriteProbe() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const result = await runWriteProbe();
  redirect(`/admin/health?probe=${encodeURIComponent(result.code)}`);
}
