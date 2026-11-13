import { canonicalInstagramUrl } from "./instagram";
import { isLineContactInputValid } from "./line";

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseContactUrl(input: string, kind: "line" | "instagram"): { ok: true; url: string } | { ok: false } {
  const raw = input.trim();
  if (!raw) return { ok: true, url: "" };
  if (kind === "line") {
    if (!isLineContactInputValid(raw)) return { ok: false };
    return { ok: true, url: raw };
  }
  if (isHttpUrl(raw)) {
    const url = canonicalInstagramUrl(raw);
    return url ? { ok: true, url } : { ok: false };
  }
  if (kind === "instagram") {
    const username = raw.replace(/^@/, "");
    if (/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      return { ok: true, url: `https://instagram.com/${username}` };
    }
  }
  return { ok: false };
}
