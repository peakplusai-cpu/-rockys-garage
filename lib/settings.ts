import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { unstable_cache } from "next/cache";
import { dirname, join } from "path";
import {
  PUBLIC_DATA_TAG,
  failSoft,
  isReadOnlyRuntime,
  supabaseAdmin,
  supabaseAdminConfigured,
  supabaseAnonConfigured,
  supabaseConfigured,
  supabasePublic,
} from "./supabase";

export type VideoSlot = { url: string; caption: string };

export const FEATURED_VIDEO_COUNT = 3;

export type SiteSettings = {
  lineUrl: string;
  instagramUrl: string;
  featuredVideoUrl: string;
  featuredVideoCaption: string;
  featuredVideos: VideoSlot[];
};

const SETTINGS_PATH = join(process.cwd(), "data", "settings.json");

export const PLACEHOLDER_LINE = "https://line.me/R/ti/p/@rockysgarage";
export const PLACEHOLDER_INSTAGRAM = "https://instagram.com/rockysgarage";

export function emptyVideoSlots(): VideoSlot[] {
  return Array.from({ length: FEATURED_VIDEO_COUNT }, () => ({ url: "", caption: "" }));
}

function padVideoSlots(slots: VideoSlot[]): VideoSlot[] {
  const next = emptyVideoSlots();
  slots.slice(0, FEATURED_VIDEO_COUNT).forEach((slot, index) => {
    next[index] = {
      url: String(slot?.url ?? "").trim(),
      caption: String(slot?.caption ?? "").trim().slice(0, 280),
    };
  });
  return next;
}

export function defaultSettings(): SiteSettings {
  const featuredVideos = emptyVideoSlots();
  return {
    lineUrl: process.env.NEXT_PUBLIC_LINE_URL || PLACEHOLDER_LINE,
    instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || PLACEHOLDER_INSTAGRAM,
    featuredVideoUrl: "",
    featuredVideoCaption: "",
    featuredVideos,
  };
}

function videoFromLegacy(instagram?: string): { slots: VideoSlot[]; hasList: boolean } {
  const empty = { slots: emptyVideoSlots(), hasList: false };
  const raw = (instagram || "").trim();
  if (!raw || raw.startsWith("@") || /^[A-Za-z0-9._]{1,30}$/.test(raw)) return empty;
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as {
        v?: string;
        url?: string;
        c?: string;
        caption?: string;
        videos?: { v?: string; url?: string; c?: string; caption?: string }[];
      };
      if (Array.isArray(parsed.videos)) {
        return {
          hasList: true,
          slots: padVideoSlots(
            parsed.videos.map((item) => ({
              url: String(item?.v || item?.url || ""),
              caption: String(item?.c || item?.caption || ""),
            }))
          ),
        };
      }
      const slots = emptyVideoSlots();
      slots[0] = { url: String(parsed.v || parsed.url || ""), caption: String(parsed.c || parsed.caption || "") };
      return { slots, hasList: false };
    } catch {
      return empty;
    }
  }
  const slots = emptyVideoSlots();
  slots[0] = { url: raw, caption: "" };
  return { slots, hasList: false };
}

function videoPack(settings: SiteSettings): string {
  const slots = padVideoSlots(settings.featuredVideos?.length ? settings.featuredVideos : [
    { url: settings.featuredVideoUrl, caption: settings.featuredVideoCaption },
  ]);
  if (slots.every((slot) => !slot.url && !slot.caption)) return "";
  return JSON.stringify({
    v: slots[0].url,
    c: slots[0].caption,
    videos: slots.map((slot) => ({ v: slot.url, c: slot.caption })),
  });
}

function normalize(partial: Partial<SiteSettings> & { instagram?: string }): SiteSettings {
  const defaults = defaultSettings();
  const packed = videoFromLegacy(partial.instagram);
  const slots = packed.hasList ? packed.slots : emptyVideoSlots();
  if (!packed.hasList) {
    slots[0] = {
      url: String(partial.featuredVideoUrl || packed.slots[0].url || ""),
      caption: String(partial.featuredVideoCaption || packed.slots[0].caption || ""),
    };
  }
  if (Array.isArray(partial.featuredVideos) && partial.featuredVideos.some((slot) => slot?.url || slot?.caption)) {
    partial.featuredVideos.forEach((slot, index) => {
      if (index >= FEATURED_VIDEO_COUNT) return;
      if (!packed.hasList || slot?.url || slot?.caption) {
        slots[index] = {
          url: String(slot?.url ?? slots[index].url),
          caption: String(slot?.caption ?? slots[index].caption),
        };
      }
    });
  }
  const instagramLooksLikeAccount =
    Boolean(partial.instagram) &&
    !String(partial.instagram).trim().startsWith("{") &&
    !String(partial.instagram).includes("http") &&
    !String(partial.instagram).includes("/");
  const instagramUrl =
    partial.instagramUrl ||
    (instagramLooksLikeAccount
      ? `https://instagram.com/${String(partial.instagram).replace(/^@/, "")}`
      : "") ||
    defaults.instagramUrl;
  return {
    lineUrl: String(partial.lineUrl || defaults.lineUrl),
    instagramUrl,
    featuredVideoUrl: slots[0].url,
    featuredVideoCaption: slots[0].caption,
    featuredVideos: slots,
  };
}

const cachedRemoteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!supabaseAnonConfigured() && !supabaseAdminConfigured()) return defaultSettings();
    const row = await failSoft(
      supabasePublic()
        .from("rocky_site_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) return null;
          return data as {
            instagram?: string;
            line_url?: string;
            instagram_url?: string;
            featured_video_url?: string;
            featured_video_caption?: string;
          };
        }),
      null
    );
    // Throw so a timed-out read is not cached as "no videos". The homepage then
    // keeps the previous page instead of flashing an empty row.
    if (!row) throw new Error("settings unavailable");
    return normalize({
      lineUrl: row.line_url,
      instagramUrl: row.instagram_url,
      instagram: row.instagram,
      featuredVideoUrl: row.featured_video_url,
      featuredVideoCaption: row.featured_video_caption,
    });
  },
  ["rocky-public-settings"],
  { revalidate: 60, tags: [PUBLIC_DATA_TAG] }
);

export async function getSettings(): Promise<SiteSettings> {
  if (supabaseConfigured()) {
    return cachedRemoteSettings();
  }
  if (isReadOnlyRuntime()) return defaultSettings();
  try {
    if (!existsSync(SETTINGS_PATH)) {
      const seeded = defaultSettings();
      persist(seeded);
      return seeded;
    }
    const parsed = JSON.parse(readFileSync(SETTINGS_PATH, "utf8")) as Partial<SiteSettings> & {
      instagram?: string;
    };
    return normalize(parsed);
  } catch {
    return defaultSettings();
  }
}

function persist(settings: SiteSettings): void {
  if (isReadOnlyRuntime()) return;
  try {
    mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
    const tmp = `${SETTINGS_PATH}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(settings, null, 2), "utf8");
    renameSync(tmp, SETTINGS_PATH);
  } catch (error) {
    console.error("settings persist skipped", error);
  }
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  if (supabaseAdminConfigured()) {
    const { error } = await supabaseAdmin()
      .from("rocky_site_settings")
      .upsert({
        id: 1,
        instagram: videoPack(settings),
        line_url: settings.lineUrl,
        instagram_url: settings.instagramUrl,
        featured_video_url: settings.featuredVideoUrl,
        featured_video_caption: settings.featuredVideoCaption,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      const { error: fallback } = await supabaseAdmin()
        .from("rocky_site_settings")
        .upsert({
          id: 1,
          instagram: videoPack(settings),
          line_url: settings.lineUrl,
          instagram_url: settings.instagramUrl,
          updated_at: new Date().toISOString(),
        });
      if (fallback) throw error;
    }
    return;
  }
  if (supabaseConfigured()) {
    throw new Error("Saving contact URLs needs SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  }
  persist(settings);
}
