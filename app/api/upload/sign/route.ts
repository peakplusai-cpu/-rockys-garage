import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createSignedInventoryUpload } from "@/lib/direct-upload";
import { MAX_UPLOAD_BYTES, UPLOAD_SIZE_ERROR } from "@/lib/images";
import { allowRate, ipFromHeaders } from "@/lib/rate-limit";
import { adminErrorMessage } from "@/lib/admin-errors";
import { supabaseConfigured, supabaseWriteBlocker } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowRate(`upload-sign:${ipFromHeaders(request.headers)}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "上傳過於頻繁，請稍後再試。" }, { status: 429 });
  }
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > 2048) {
    return NextResponse.json({ error: UPLOAD_SIZE_ERROR }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { size?: unknown } | null;
  const size = Number(body?.size);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: UPLOAD_SIZE_ERROR }, { status: 400 });
  }

  const blocker = supabaseWriteBlocker();
  if (blocker) return NextResponse.json({ error: adminErrorMessage(blocker) }, { status: 500 });
  if (!supabaseConfigured()) return NextResponse.json({ mode: "local" });

  try {
    return NextResponse.json(await createSignedInventoryUpload());
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("signed upload", message.slice(0, 160));
    const safe = message.startsWith("找不到") || message.startsWith("照片") ? message : "照片上傳失敗。";
    return NextResponse.json({ error: safe }, { status: 500 });
  }
}
