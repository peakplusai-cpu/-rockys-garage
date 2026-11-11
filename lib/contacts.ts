import { lineTarget } from "./line";

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
    const url = lineTarget(isHttpUrl(raw) ? raw : "", isHttpUrl(raw) ? "" : raw).addFriendWeb;
    return url ? { ok: true, url } : { ok: false };
  }
  if (isHttpUrl(raw)) return { ok: true, url: raw };
  if (kind === "instagram") {
    const username = raw.replace(/^@/, "");
    if (/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      return { ok: true, url: `https://instagram.com/${username}` };
    }
  }
  return { ok: false };
}
