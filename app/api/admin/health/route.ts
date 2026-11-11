import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { checkSupabaseHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const report = await checkSupabaseHealth();
  return NextResponse.json(report, { status: report.connected ? 200 : 503 });
}
