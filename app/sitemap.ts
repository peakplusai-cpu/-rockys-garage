import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { listPublishedCars } from "@/lib/store";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/inquiry`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  try {
    const cars = await listPublishedCars();
    for (const car of cars) {
      entries.push({
        url: `${SITE_URL}/cars/${car.slug}`,
        lastModified: car.updatedAt ? new Date(car.updatedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch {
    // Public pages still belong in the map if inventory is unreachable.
  }

  return entries;
}
