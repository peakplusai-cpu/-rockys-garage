import { createHmac, randomBytes } from "crypto";
import { resolveSessionSecret, safeEqual } from "./guards";

const PROOF_TTL_MS = 10 * 60 * 1000;

/** Incoming objects stay under this prefix until the server has sniffed them. */
export const INCOMING_UPLOAD = /^in\/[a-f0-9]{32}$/;

export function newIncomingPath(): string {
  return `in/${randomBytes(16).toString("hex")}`;
}

/** Binds one incoming object to this server's session secret for a few minutes. */
export function issueUploadProof(path: string): string | null {
  const secret = resolveSessionSecret();
  if (!secret || !INCOMING_UPLOAD.test(path)) return null;
  const exp = Date.now() + PROOF_TTL_MS;
  const mac = createHmac("sha256", secret).update(`${exp}.${path}`).digest("hex");
  return `${exp}.${mac}`;
}

export function verifyUploadProof(path: string, proof: string): boolean {
  const secret = resolveSessionSecret();
  if (!secret || !INCOMING_UPLOAD.test(path) || !proof) return false;
  const dot = proof.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(proof.slice(0, dot));
  const mac = proof.slice(dot + 1);
  if (!mac || !Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = createHmac("sha256", secret).update(`${exp}.${path}`).digest("hex");
  return safeEqual(mac, expected);
}
