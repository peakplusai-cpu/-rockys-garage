import { MAX_UPLOAD_BYTES, UPLOAD_SIZE_ERROR, UPLOAD_TYPE_ERROR, sniffImageBytes, type SniffedImage } from "./images";
import { newIncomingPath, issueUploadProof } from "./upload-ticket";
import { supabaseAdmin, supabaseAnonKey, supabaseSecretKey, supabaseUrl } from "./supabase";

const BUCKET = "rocky-uploads";

export type SignedUpload = {
  mode: "signed";
  signedUrl: string;
  token: string;
  path: string;
  proof: string;
  apikey?: string;
};

type ObjectInfo = {
  size?: number;
  contentType?: string;
  content_type?: string;
  metadata?: { mimetype?: string; size?: number };
};

function mimeOf(info: ObjectInfo): string {
  return String(info.contentType || info.content_type || info.metadata?.mimetype || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function sameMime(actual: string, expected: string): boolean {
  const norm = (value: string) => (value === "image/jpg" ? "image/jpeg" : value);
  return norm(actual) === norm(expected);
}

/** Ask Supabase for a one-object upload URL. The file bytes never pass through this server. */
export async function createSignedInventoryUpload(): Promise<SignedUpload> {
  const path = newIncomingPath();
  const proof = issueUploadProof(path);
  if (!proof) throw new Error("SESSION_SECRET");
  const db = supabaseAdmin(15000);
  const signed = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (signed.error || !signed.data?.signedUrl || !signed.data.token) {
    const missing = /bucket not found/i.test(signed.error?.message || "");
    throw new Error(missing ? "找不到 rocky-uploads bucket，請執行 supabase/schema.sql" : "照片上傳失敗。");
  }
  const anon = supabaseAnonKey();
  return {
    mode: "signed",
    signedUrl: signed.data.signedUrl,
    token: signed.data.token,
    path,
    proof,
    ...(anon ? { apikey: anon } : {}),
  };
}

async function readPrefix(path: string): Promise<Uint8Array | null> {
  const base = supabaseUrl();
  const key = supabaseSecretKey();
  if (!base || !key) return null;
  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      Range: "bytes=0-31",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok && res.status !== 206) {
    await res.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < 32) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const need = 32 - total;
      chunks.push(value.byteLength > need ? value.subarray(0, need) : value);
      total += Math.min(value.byteLength, need);
      if (total >= 32) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function removeObject(path: string): Promise<void> {
  const db = supabaseAdmin(15000);
  const removed = await db.storage.from(BUCKET).remove([path]);
  if (removed.error) console.error("upload cleanup", removed.error.message.slice(0, 160));
}

/**
 * Sniff the object Supabase already stored, then publish a copy with the sniffed type.
 * Oversized or non-image objects are deleted and not returned.
 */
export async function finalizeSignedUpload(path: string): Promise<{ url: string } | { error: string }> {
  const db = supabaseAdmin(20000);
  const info = await db.storage.from(BUCKET).info(path);
  if (info.error || !info.data) return { error: "照片上傳失敗。" };
  const meta = info.data as ObjectInfo;
  const size = meta.size ?? meta.metadata?.size ?? 0;
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    await removeObject(path);
    return { error: UPLOAD_SIZE_ERROR };
  }
  const prefix = await readPrefix(path);
  const image: SniffedImage | null = prefix ? sniffImageBytes(prefix) : null;
  if (!image) {
    await removeObject(path);
    return { error: UPLOAD_TYPE_ERROR };
  }

  const id = path.slice(3);
  const finalPath = `${id}.${image.ext}`;
  const copied = await db.storage.from(BUCKET).copy(path, finalPath, {
    copyMetadata: false,
    metadata: { mimetype: image.contentType, cacheControl: "max-age=3600" },
  });
  if (!copied.error) {
    await removeObject(path);
    const { data } = db.storage.from(BUCKET).getPublicUrl(finalPath);
    return { url: data.publicUrl };
  }

  if (sameMime(mimeOf(meta), image.contentType)) {
    const { data } = db.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  }
  await removeObject(path);
  return { error: "照片上傳失敗。" };
}
