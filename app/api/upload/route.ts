import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, UPLOAD_SIZE_ERROR, UPLOAD_TYPE_ERROR, sniffImage } from "@/lib/images";
import { allowRate, ipFromHeaders } from "@/lib/rate-limit";
import { supabaseConfigured } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * Local disk only. Production inventory photos are uploaded from the browser
 * straight to Supabase; this route refuses them so a 30MB body never hits Vercel.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (supabaseConfigured()) {
    return NextResponse.json(
      { error: "照片請直接上傳到儲存空間。請重新整理後再試。" },
      { status: 400 }
    );
  }
  if (!allowRate(`upload:${ipFromHeaders(request.headers)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "上傳過於頻繁，請稍後再試。" }, { status: 429 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: UPLOAD_SIZE_ERROR }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sniffImage(buffer);
  if (!image) {
    return NextResponse.json({ error: UPLOAD_TYPE_ERROR }, { status: 400 });
  }
  const name = `${randomBytes(16).toString("hex")}.${image.ext}`;
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buffer);
  return NextResponse.json({ url: `/uploads/${name}` });
}
