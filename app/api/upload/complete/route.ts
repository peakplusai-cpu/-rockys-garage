import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { finalizeSignedUpload } from "@/lib/direct-upload";
import { allowRate, ipFromHeaders } from "@/lib/rate-limit";
import { verifyUploadProof } from "@/lib/upload-ticket";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!allowRate(`upload-complete:${ipFromHeaders(request.headers)}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "上傳過於頻繁，請稍後再試。" }, { status: 429 });
  }
  const announced = Number(request.headers.get("content-length") || 0);
  if (announced > 2048) {
    return NextResponse.json({ error: "照片上傳失敗。" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { path?: unknown; proof?: unknown } | null;
  const path = String(body?.path ?? "");
  const proof = String(body?.proof ?? "");
  if (!verifyUploadProof(path, proof)) {
    return NextResponse.json({ error: "照片上傳失敗。" }, { status: 400 });
  }
  try {
    const result = await finalizeSignedUpload(path);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("upload complete", message.slice(0, 160));
    return NextResponse.json({ error: "照片上傳失敗。" }, { status: 500 });
  }
}
