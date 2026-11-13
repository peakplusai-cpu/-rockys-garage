export function lineLoginEnabled(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
}

export type LineTarget = {
  id: string;
  addFriendWeb: string;
  addFriendApp: string;
  chatWeb: string;
  chatApp: string;
};

const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;

/** http(s) on any host; rejects javascript:/data: only. */
export function isSafeHttpUrl(value: string): boolean {
  return Boolean(toSafeHttpUrl(value));
}

/** @deprecated Use isSafeHttpUrl — no host allowlist. */
export function isAllowedLineUrl(value: string): boolean {
  return isSafeHttpUrl(value);
}

export function toSafeHttpUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || UNSAFE_SCHEME.test(trimmed)) return "";
  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    if (href.startsWith("line.me") || /^lin\.ee\//i.test(href)) href = `https://${href}`;
    else return "";
  }
  try {
    const url = new URL(href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function bareTokenToAddFriend(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (t.startsWith("~")) {
    return `https://line.me/R/ti/p/~${encodeURIComponent(t.slice(1))}`;
  }
  if (/^[@＠]/.test(t)) {
    const body = t.replace(/^[@＠]+/, "");
    return `https://line.me/R/ti/p/%40${encodeURIComponent(body)}`;
  }
  if (t.toLowerCase().startsWith("%40")) {
    return `https://line.me/R/ti/p/%40${encodeURIComponent(t.slice(3))}`;
  }
  return `https://line.me/R/ti/p/~${encodeURIComponent(t)}`;
}

/**
 * Final href for add-friend buttons. Full http(s) URLs are used as-is (any host).
 * Otherwise builds line.me/R/ti/p/… (%40 when input had @, ~ when bare ID).
 */
export function resolveLineHref(lineUrl: string, lineId = ""): string {
  const url = lineUrl.trim();
  const id = lineId.trim();

  const fromUrl = toSafeHttpUrl(url);
  if (fromUrl) return fromUrl;

  const fromId = toSafeHttpUrl(id);
  if (fromId) return fromId;

  const token = id || url;
  return bareTokenToAddFriend(token);
}

function officialSegmentForChat(token: string): string {
  const t = token.trim();
  if (/^[@＠]/.test(t)) return `%40${encodeURIComponent(t.replace(/^[@＠]+/, ""))}`;
  if (t.toLowerCase().startsWith("%40")) return `%40${encodeURIComponent(t.slice(3))}`;
  if (t.startsWith("~")) return `~${encodeURIComponent(t.slice(1))}`;
  return "";
}

export function resolveLineChatHref(lineUrl: string, lineId: string, message: string): string {
  const add = resolveLineHref(lineUrl, lineId);
  if (!add) return "";
  const text = message.trim();
  if (!text) return add;
  if (toSafeHttpUrl(lineUrl.trim()) || toSafeHttpUrl(lineId.trim())) return add;

  const token = lineId.trim() || lineUrl.trim();
  const segment = officialSegmentForChat(token);
  if (segment.startsWith("%40")) {
    return `https://line.me/R/oaMessage/${segment}/?${encodeURIComponent(text)}`;
  }
  return add;
}

export function lineTarget(lineUrl: string, lineId: string, message = ""): LineTarget {
  const addFriendWeb = resolveLineHref(lineUrl, lineId);
  const chatWeb = message.trim() ? resolveLineChatHref(lineUrl, lineId, message) : addFriendWeb;
  return {
    id: "",
    addFriendWeb,
    addFriendApp: "",
    chatWeb,
    chatApp: "",
  };
}

export function lineAddFriendHref(lineUrl: string, lineId = ""): string {
  return resolveLineHref(lineUrl, lineId);
}

export function officialId(lineUrl: string, lineId: string): string {
  const token = lineId.trim() || lineUrl.trim();
  if (/^[@＠]/.test(token)) return `@${token.replace(/^[@＠]+/, "")}`;
  if (token.startsWith("~")) return token;
  return token;
}

export function isLineContactInputValid(input: string): boolean {
  const raw = input.trim();
  if (!raw) return true;
  if (UNSAFE_SCHEME.test(raw)) return false;
  if (/^https?:\/\//i.test(raw)) return Boolean(toSafeHttpUrl(raw));
  return raw.length > 0;
}

export function resolveLineUrl(lineUrl: string, lineId: string): string {
  return resolveLineHref(lineUrl, lineId);
}
