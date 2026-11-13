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

const LINE_ADD_FRIEND = /^\/R\/ti\/p\/([^/?#]+)/i;
const LINE_LEGACY_TI_P = /^\/ti\/p\/([^/?#]+)/i;
const LINE_OA_MESSAGE = /^\/R\/oaMessage\/([^/?#]+)/i;

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

/** Encode add-friend path segment: official → %40id, personal → ~id (only when input had ~). */
export function encodeLinePathId(segment: string): string {
  let decoded = segment.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep */
  }
  if (decoded.startsWith("~")) {
    return `~${encodeURIComponent(decoded.slice(1))}`;
  }
  const officialBody = decoded.replace(/^(?:%40|@|＠)+/i, "");
  if (!officialBody) return "";
  return `%40${encodeURIComponent(officialBody)}`;
}

/**
 * Fix line.me URLs pasted from the manager (literal @ in path often 404s).
 * lin.ee and non-line hosts are unchanged.
 */
export function canonicalizeLineHttpUrl(href: string): string {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host !== "line.me" && !host.endsWith(".line.me")) return href;

    const add = url.pathname.match(LINE_ADD_FRIEND);
    if (add) {
      url.pathname = `/R/ti/p/${encodeLinePathId(add[1])}`;
      return url.toString();
    }

    const legacy = url.pathname.match(LINE_LEGACY_TI_P);
    if (legacy) {
      url.pathname = `/R/ti/p/${encodeLinePathId(legacy[1])}`;
      return url.toString();
    }

    const oa = url.pathname.match(LINE_OA_MESSAGE);
    if (oa) {
      url.pathname = `/R/oaMessage/${encodeLinePathId(oa[1])}`;
      return url.toString();
    }

    return href;
  } catch {
    return href;
  }
}

function bareTokenToAddFriend(token: string): string {
  const t = token.trim();
  if (!t) return "";
  if (t.startsWith("~")) {
    return `https://line.me/R/ti/p/~${encodeURIComponent(t.slice(1))}`;
  }
  return `https://line.me/R/ti/p/${encodeLinePathId(t)}`;
}

/**
 * Final href for add-friend buttons. http(s) on any host; line.me URLs get @→%40 fix.
 * Non-URL tokens: official ID (with or without @, or bare Premium/Basic) → %40…; ~prefix → personal.
 */
export function resolveLineHref(lineUrl: string, lineId = ""): string {
  const url = lineUrl.trim();
  const id = lineId.trim();

  const fromUrl = toSafeHttpUrl(url);
  if (fromUrl) return canonicalizeLineHttpUrl(fromUrl);

  const fromId = toSafeHttpUrl(id);
  if (fromId) return canonicalizeLineHttpUrl(fromId);

  const token = id || url;
  return bareTokenToAddFriend(token);
}

function officialSegmentForChat(token: string): string {
  const t = token.trim();
  if (t.startsWith("~")) return "";
  return encodeLinePathId(t);
}

export function resolveLineChatHref(lineUrl: string, lineId: string, message: string): string {
  const add = resolveLineHref(lineUrl, lineId);
  if (!add) return "";
  const text = message.trim();
  if (!text) return add;

  const token = lineId.trim() || lineUrl.trim();
  if (toSafeHttpUrl(lineUrl.trim()) || toSafeHttpUrl(lineId.trim())) {
    try {
      const url = new URL(add);
      const oa = url.pathname.match(LINE_OA_MESSAGE);
      if (oa) {
        url.search = `?${encodeURIComponent(text)}`;
        return url.toString();
      }
    } catch {
      /* fall through */
    }
    return add;
  }

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
