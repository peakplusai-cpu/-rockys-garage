import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { adminErrorMessage, classifyDbError } from "@/lib/admin-errors";
import { MAX_UPLOAD_BYTES, sniffImage } from "@/lib/images";
import { allowRate, ipFromHeaders } from "@/lib/rate-limit";
import { supabaseAdmin, supabaseConfigured, supabaseWriteBlocker } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "照片需為 4MB 以內的 JPEG、PNG、GIF 或 WebP。" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sniffImage(buffer);
  if (!image) {
    return NextResponse.json({ error: "只接受 JPEG、PNG、GIF 或 WebP 照片。" }, { status: 400 });
  }
  const name = `${randomBytes(16).toString("hex")}.${image.ext}`;

  const blocker = supabaseWriteBlocker();
  if (blocker) {
    return NextResponse.json({ error: adminErrorMessage(blocker) }, { status: 500 });
  }

  if (supabaseConfigured()) {
    try {
      const db = supabaseAdmin();
      const { error } = await db.storage.from("rocky-uploads").upload(name, buffer, {
        contentType: image.contentType,
        upsert: false,
      });
      if (error) {
        const bucketMissing = /bucket not found/i.test(error.message);
        return NextResponse.json(
          { error: bucketMissing ? "找不到 rocky-uploads bucket，請執行 supabase/schema.sql" : "照片上傳失敗。" },
          { status: 500 }
        );
      }
      const { data } = db.storage.from("rocky-uploads").getPublicUrl(name);
      return NextResponse.json({ url: data.publicUrl });
    } catch (error) {
      const c = classifyDbError(error);
      return NextResponse.json({ error: adminErrorMessage(c.code, c.detail) }, { status: 500 });
    }
  }

  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buffer);
  return NextResponse.json({ url: `/uploads/${name}` });
}
