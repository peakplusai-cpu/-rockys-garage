export function lineLoginEnabled(): boolean {
  return Boolean(process.env.LINE_CHANNEL_ID && process.env.LINE_CHANNEL_SECRET);
}

export type LineTarget = {
  /** Display token (@official or ~personal), empty when using a short link. */
  id: string;
  addFriendWeb: string;
  addFriendApp: string;
  chatWeb: string;
  chatApp: string;
};

const LINE_ME_PATH_ID =
  /(?:https?:\/\/)?(?:[^/]+\.)?line\.me\/(?:R\/(?:ti\/p|oaMessage)\/|ti\/p\/)([^/?#]+)/i;

const LINE_HOSTS = new Set(["line.me", "www.line.me", "lin.ee", "page.line.me", "liff.line.me"]);

const OFFICIAL_ID = /^[A-Za-z0-9._-]{2,30}$/;
const PERSONAL_ID = /^[A-Za-z0-9._-]{4,30}$/;

/** Public LINE links may only point at LINE hosts, including lin.ee short links. */
export function isAllowedLineUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    if (LINE_HOSTS.has(host)) return true;
    return host.endsWith(".line.me");
  } catch {
    return false;
  }
}

function httpsUrl(value: string): string {
  const url = new URL(value);
  url.protocol = "https:";
  return url.toString();
}

function decodeToken(raw: string): string {
  let token = raw.trim();
  try {
    token = decodeURIComponent(token);
  } catch {
    /* keep */
  }
  return token.trim();
}

type ParsedLine =
  | { kind: "official"; id: string }
  | { kind: "personal"; id: string }
  | { kind: "short"; url: string };

function pathTokenToParsed(token: string): ParsedLine | null {
  const t = decodeToken(token);
  if (!t) return null;
  if (t.startsWith("~")) {
    const id = t.slice(1).trim();
    return id && PERSONAL_ID.test(id) ? { kind: "personal", id } : null;
  }
  const officialStem = t.replace(/^(?:%40|@|＠)+/i, "");
  if (officialStem && OFFICIAL_ID.test(officialStem)) {
    return { kind: "official", id: officialStem };
  }
  return null;
}

function parseBareToken(raw: string): ParsedLine | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t) || /^lin\.ee\//i.test(t)) return null;

  if (t.startsWith("~")) {
    const id = t.slice(1).trim();
    return id && PERSONAL_ID.test(id) ? { kind: "personal", id } : null;
  }

  const official = t.replace(/^(?:@|＠)+/, "");
  if (official && OFFICIAL_ID.test(official)) {
    return { kind: "official", id: official };
  }

  return null;
}

function parseHttpLineUrl(url: string): ParsedLine | null {
  const href = url.trim();
  if (!href) return null;

  const withScheme = /^https?:\/\//i.test(href) ? href : /^lin\.ee\//i.test(href) || href.startsWith("line.me") ? `https://${href}` : "";
  if (!withScheme || !isAllowedLineUrl(withScheme)) return null;

  if (new URL(withScheme).hostname.toLowerCase() === "lin.ee") {
    return { kind: "short", url: httpsUrl(withScheme) };
  }

  try {
    const host = new URL(withScheme).hostname.toLowerCase();
    if (host === "line.me" || host.endsWith(".line.me")) {
      const match = withScheme.match(LINE_ME_PATH_ID);
      if (match?.[1]) return pathTokenToParsed(match[1]);
    }
  } catch {
    return null;
  }
  return null;
}

/** Parse site/staff LINE fields into official id, personal id, or a short add-friend URL. */
export function parseLineInput(lineUrl: string, lineId: string): ParsedLine | null {
  const idRaw = lineId.trim();
  if (idRaw) {
    if (idRaw.startsWith("~")) {
      const id = idRaw.slice(1).trim();
      if (id && PERSONAL_ID.test(id)) return { kind: "personal", id };
    } else {
      const id = idRaw.replace(/^(?:@|＠)+/, "");
      if (id && OFFICIAL_ID.test(id)) return { kind: "official", id };
    }
  }

  const urlRaw = lineUrl.trim();
  if (!urlRaw) return null;

  const fromHttp = parseHttpLineUrl(urlRaw);
  if (fromHttp) return fromHttp;

  return parseBareToken(urlRaw);
}

function officialWebPath(id: string): string {
  return `https://line.me/R/ti/p/%40${encodeURIComponent(id)}`;
}

function personalWebPath(id: string): string {
  return `https://line.me/R/ti/p/~${encodeURIComponent(id)}`;
}

function officialAppPath(id: string): string {
  return `@${id}`;
}

function personalAppPath(id: string): string {
  return `~${id}`;
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message.trim());
}

export function lineTarget(lineUrl: string, lineId: string, message = ""): LineTarget {
  const parsed = parseLineInput(lineUrl, lineId);
  const empty: LineTarget = { id: "", addFriendWeb: "", addFriendApp: "", chatWeb: "", chatApp: "" };
  if (!parsed) return empty;

  const text = encodeMessage(message || "您好，我想預約鑑賞。");

  if (parsed.kind === "short") {
    return {
      id: "",
      addFriendWeb: parsed.url,
      addFriendApp: "",
      chatWeb: parsed.url,
      chatApp: "",
    };
  }

  if (parsed.kind === "official") {
    const addFriendWeb = officialWebPath(parsed.id);
    const segment = officialAppPath(parsed.id);
    const addFriendApp = `line://ti/p/${segment}`;
    const chatWeb = `https://line.me/R/oaMessage/%40${encodeURIComponent(parsed.id)}/?${text}`;
    const chatApp = `line://oaMessage/${segment}/?${text}`;
    return { id: segment, addFriendWeb, addFriendApp, chatWeb, chatApp };
  }

  const addFriendWeb = personalWebPath(parsed.id);
  const segment = personalAppPath(parsed.id);
  return {
    id: segment,
    addFriendWeb,
    addFriendApp: `line://ti/p/${segment}`,
    chatWeb: addFriendWeb,
    chatApp: `line://ti/p/${segment}`,
  };
}

/** Final https add-friend URL for display (admin preview + public links). */
export function lineAddFriendHref(lineUrl: string, lineId = ""): string {
  return lineTarget(lineUrl, lineId).addFriendWeb;
}

export function officialId(lineUrl: string, lineId: string): string {
  const parsed = parseLineInput(lineUrl, lineId);
  if (!parsed) return "";
  if (parsed.kind === "official") return officialAppPath(parsed.id);
  if (parsed.kind === "personal") return personalAppPath(parsed.id);
  return "";
}

export function isLineContactInputValid(input: string): boolean {
  const raw = input.trim();
  if (!raw) return true;
  return Boolean(lineTarget(raw, "").addFriendWeb);
}

/** @deprecated Use raw storage + lineTarget at render; kept for callers that need a resolved URL. */
export function resolveLineUrl(lineUrl: string, lineId: string): string {
  return lineTarget(lineUrl, lineId).addFriendWeb;
}
