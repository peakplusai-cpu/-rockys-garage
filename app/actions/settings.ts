"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { adminErrorMessage, classifyDbError, isRedirectError } from "@/lib/admin-errors";
import { isAuthenticated } from "@/lib/auth";
import { parseContactUrl } from "@/lib/contacts";
import { getAdminSettings, saveSettings } from "@/lib/settings";
import { parseFeaturedVideoUrl } from "@/lib/video";

export type SettingsFormResult = { error: string } | undefined;

export async function saveContacts(formData: FormData): Promise<SettingsFormResult> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const line = parseContactUrl(String(formData.get("lineUrl") ?? ""), "line");
  const ig = parseContactUrl(String(formData.get("instagramUrl") ?? ""), "instagram");
  const featuredVideos = [1, 2, 3].map((index) => {
    const suffix = index === 1 ? "" : String(index);
    const parsed = parseFeaturedVideoUrl(String(formData.get(`featuredVideoUrl${suffix}`) ?? ""));
    return {
      ok: parsed.ok,
      url: parsed.ok ? parsed.url : "",
      caption: String(formData.get(`featuredVideoCaption${suffix}`) ?? "").trim().slice(0, 280),
    };
  });
  if (!line.ok) return { error: "LINE 網址格式不正確。" };
  if (!ig.ok) return { error: "Instagram 網址格式不正確。" };
  if (featuredVideos.some((slot) => !slot.ok)) {
    return { error: "請貼 Instagram 貼文／Reels 或抖音影片連結。" };
  }

  try {
    const current = await getAdminSettings();
    const slots = featuredVideos.map(({ url, caption }) => ({ url, caption }));
    await saveSettings({
      ...current,
      lineUrl: line.url,
      instagramUrl: ig.url,
      featuredVideos: slots,
      featuredVideoUrl: slots[0].url,
      featuredVideoCaption: slots[0].caption,
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("saveContacts", error);
    const classified = classifyDbError(error);
    return { error: adminErrorMessage(classified.code, classified.detail) };
  }
  revalidatePublic(["/admin/settings"]);
  redirect("/admin/settings?saved=1");
}
