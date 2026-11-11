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

const URL_ID =
  /(?:line\.me\/R\/(?:ti\/p|oaMessage)\/|line\.me\/ti\/p\/|page\.line\.me\/)((?:~|%40|@|＠)*)([^/?#\\]+)/i;

function cleanLineId(raw: string): string {
  let id = raw.trim().replace(/\\+$/g, "");
  try {
    id = decodeURIComponent(id);
  } catch {
    /* keep the raw token */
  }
  id = id.trim().replace(/\\+$/g, "").replace(/\/+$/g, "");
  id = id.replace(/^(?:~|%40|@|＠)+/gi, "");
  if (!/^[A-Za-z0-9._-]{2,20}$/.test(id)) return "";
  return `@${id}`;
}

export function officialId(lineUrl: string, lineId: string): string {
  if (lineId.trim()) return cleanLineId(lineId);
  const match = lineUrl.trim().match(URL_ID);
  if (!match) return "";
  return cleanLineId(`${match[1] ?? ""}${match[2] ?? ""}`);
}

function encodeMessage(message: string): string {
  return encodeURIComponent(message.trim());
}

export function lineTarget(lineUrl: string, lineId: string, message = ""): LineTarget {
  const id = officialId(lineUrl, lineId);
  const text = encodeMessage(message || "您好，我想預約鑑賞。");
  const web = lineUrl.trim();
  const webHref = web
    ? /^https?:\/\//i.test(web)
      ? web
      : web.startsWith("line.me")
        ? `https://${web}`
        : ""
    : "";

  const addFriendWeb = id ? `https://line.me/R/ti/p/${id}` : webHref;
  const addFriendApp = id ? `line://ti/p/${id}` : "";
  const chatWeb = id ? `https://line.me/R/oaMessage/${id}/?${text}` : addFriendWeb;
  const chatApp = id ? `line://oaMessage/${id}/?${text}` : addFriendApp;

  return { id, addFriendWeb, addFriendApp, chatWeb, chatApp };
}

/** Canonical add-friend https URL. Kept for staff save + older callers. */
export function resolveLineUrl(lineUrl: string, lineId: string): string {
  return lineTarget(lineUrl, lineId).addFriendWeb;
}
