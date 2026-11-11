import { revalidatePath, revalidateTag } from "next/cache";
import { PUBLIC_DATA_TAG } from "./supabase";

export function revalidatePublic(extraPaths: string[] = []): void {
  revalidateTag(PUBLIC_DATA_TAG);
  revalidatePath("/");
  revalidatePath("/inquiry");
  for (const path of extraPaths) revalidatePath(path);
}
