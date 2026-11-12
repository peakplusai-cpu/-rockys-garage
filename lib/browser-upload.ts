import { MAX_UPLOAD_BYTES, UPLOAD_SIZE_ERROR, UPLOAD_TYPE_ERROR, sniffImageBytes } from "./images";

type SignedUpload = {
  mode: "signed";
  signedUrl: string;
  token: string;
  path: string;
  proof: string;
  apikey?: string;
};

type SignResult = { mode: "local" } | SignedUpload;

async function readJson(res: Response): Promise<{ url?: string; error?: string } & Partial<SignResult>> {
  return (await res.json().catch(() => ({}))) as { url?: string; error?: string } & Partial<SignResult>;
}

/**
 * Inventory photos go straight to Supabase when it is configured.
 * Only the local JSON/dev server receives the file body, and only then is the body under 30MB acceptable.
 */
export async function uploadInventoryPhoto(file: File): Promise<string> {
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error(UPLOAD_SIZE_ERROR);
  const header = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const sniffed = sniffImageBytes(header);
  if (!sniffed) throw new Error(UPLOAD_TYPE_ERROR);

  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ size: file.size }),
  });
  const sign = await readJson(signRes);
  if (!signRes.ok) throw new Error(sign.error || "照片上傳失敗。");

  if (sign.mode !== "signed" || !sign.signedUrl || !sign.path || !sign.proof) {
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/upload", { method: "POST", body });
    const data = await readJson(res);
    if (!res.ok || !data.url) throw new Error(data.error || "照片上傳失敗。");
    return data.url;
  }

  const headers: Record<string, string> = {
    "content-type": sniffed.contentType,
    "cache-control": "max-age=3600",
    "x-upsert": "false",
  };
  // The anon key is a public JWT. The upload token stays in the signed URL;
  // sending it as Authorization makes the API gateway reject it as a bad JWT.
  if (sign.apikey) {
    headers.apikey = sign.apikey;
    headers.authorization = `Bearer ${sign.apikey}`;
  }
  const put = await fetch(sign.signedUrl, { method: "PUT", headers, body: file });
  if (!put.ok) {
    throw new Error("照片上傳失敗。請確認 rocky-uploads bucket 與 SUPABASE_SERVICE_ROLE_KEY。");
  }

  const doneRes = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: sign.path, proof: sign.proof }),
  });
  const done = await readJson(doneRes);
  if (!doneRes.ok || !done.url) throw new Error(done.error || "照片上傳失敗。");
  return done.url;
}
