const USERNAME = /^[A-Za-z0-9._]{1,30}$/;
const NON_PROFILE_PATHS = new Set(["p", "reel", "reels", "tv", "stories", "explore", "accounts", "direct", "about"]);

export type InstagramParse = { ok: true; username: string } | { ok: false };

/** Accepts @name, name, or an instagram.com profile URL. Empty input is valid and means "no account". */
export function parseInstagram(input: string): InstagramParse {
  const raw = input.trim();
  if (!raw) return { ok: true, username: "" };

  let candidate = raw;
  const urlLike = /^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/|^(?:https?:\/\/)?instagr\.am\//i;
  if (urlLike.test(raw)) {
    const path = raw.replace(urlLike, "").split(/[?#]/)[0];
    const first = path.split("/").filter(Boolean)[0] ?? "";
    if (!first || NON_PROFILE_PATHS.has(first.toLowerCase())) return { ok: false };
    candidate = first;
  }

  const username = candidate.replace(/^@/, "");
  return USERNAME.test(username) ? { ok: true, username } : { ok: false };
}

export function instagramWebUrl(username: string): string {
  return username ? `https://instagram.com/${username}` : "";
}

export function instagramAppUrl(username: string): string {
  return username ? `instagram://user?username=${encodeURIComponent(username)}` : "";
}
