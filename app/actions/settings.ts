"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { parseContactUrl } from "@/lib/contacts";
import { getSettings, saveSettings } from "@/lib/settings";
import { parseFeaturedVideoUrl } from "@/lib/video";

export async function saveContacts(formData: FormData) {
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
  if (!line.ok) redirect("/admin/settings?error=line");
  if (!ig.ok) redirect("/admin/settings?error=instagram");
  if (featuredVideos.some((slot) => !slot.ok)) redirect("/admin/settings?error=video");

  let current: Awaited<ReturnType<typeof getSettings>>;
  try {
    current = await getSettings();
  } catch {
    redirect("/admin/settings?error=save");
  }
  try {
    const slots = featuredVideos.map(({ url, caption }) => ({ url, caption }));
    await saveSettings({
      ...current,
      lineUrl: line.url,
      instagramUrl: ig.url,
      featuredVideos: slots,
      featuredVideoUrl: slots[0].url,
      featuredVideoCaption: slots[0].caption,
    });
  } catch {
    redirect("/admin/settings?error=save");
  }
  revalidatePublic(["/admin/settings"]);
  redirect("/admin/settings?saved=1");
}
