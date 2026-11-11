export type VideoPlatform = "instagram" | "tiktok";

export type FeaturedVideo = {
  platform: VideoPlatform;
  url: string;
  caption: string;
};

function asUrl(raw: string): URL | null {
  try {
    return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

export function parseFeaturedVideoUrl(
  input: string
): { ok: true; url: string; platform: VideoPlatform | null } | { ok: false } {
  const raw = input.trim();
  if (!raw) return { ok: true, url: "", platform: null };
  const url = asUrl(raw);
  if (!url) return { ok: false };
  const host = url.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "instagram.com" || host === "instagr.am") {
    const path = url.pathname.replace(/\/+$/, "") + "/";
    if (!/^\/(?:[A-Za-z0-9._]+\/)?(?:reel|p|tv|reels|share)\//i.test(path)) return { ok: false };
    return { ok: true, url: `https://www.instagram.com${path}`, platform: "instagram" };
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    return { ok: true, url: `${url.origin}${url.pathname.replace(/\/+$/, "")}`, platform: "tiktok" };
  }
  return { ok: false };
}

export function tiktokVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match?.[1] ?? "";
}

export function parseFeaturedVideo(url: string, caption = ""): FeaturedVideo | null {
  const parsed = parseFeaturedVideoUrl(url);
  if (!parsed.ok || !parsed.url || !parsed.platform) return null;
  return { platform: parsed.platform, url: parsed.url, caption: caption.trim() };
}
