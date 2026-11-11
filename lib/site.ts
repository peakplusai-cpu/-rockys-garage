function resolvedSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

export const SITE_URL = resolvedSiteUrl();
export const SITE_NAME = "Rocky's Garage";
export const SITE_NAME_ZH = "洛基車庫";
export const SITE_DESCRIPTION = "Rocky's Garage｜美式精選中古車，實車實價，LINE 預約賞車";

export const jsonLdAutoDealer = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: SITE_NAME,
  alternateName: SITE_NAME_ZH,
  url: SITE_URL,
  image: `${SITE_URL}/og.jpg`,
  description: SITE_DESCRIPTION,
} as const;
