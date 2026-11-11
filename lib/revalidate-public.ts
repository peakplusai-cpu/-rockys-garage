import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_DATA_TAG } from "./supabase";

/** Call only after a write has been confirmed by the database. */
export function revalidatePublic(extraPaths: string[] = []): void {
  revalidateTag(PUBLIC_DATA_TAG);
  revalidatePath("/");
  revalidatePath("/inquiry");
  revalidatePath("/cars/[slug]", "page");
  revalidatePath("/sitemap.xml");
  for (const path of extraPaths) revalidatePath(path);
}
