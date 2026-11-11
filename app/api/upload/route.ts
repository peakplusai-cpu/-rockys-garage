import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { uid } from "@/lib/id";
import { supabaseAdmin, supabaseAdminConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const name = `${uid("up")}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (supabaseAdminConfigured()) {
    const db = supabaseAdmin();
    const { error } = await db.storage.from("rocky-uploads").upload(name, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const { data } = db.storage.from("rocky-uploads").getPublicUrl(name);
    return NextResponse.json({ url: data.publicUrl });
  }

  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: "Photo upload on Vercel needs SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY" },
      { status: 500 }
    );
  }
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buffer);
  return NextResponse.json({ url: `/uploads/${name}` });
}
