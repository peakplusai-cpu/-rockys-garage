"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { parseBodyType, parseDoors, parseSpecs } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import { uid } from "@/lib/id";
import { classifyDbError, isRedirectError, adminErrorMessage } from "@/lib/admin-errors";
import { getAdminCar, removeCar, saveCar, setCarPublished } from "@/lib/store";
import type { Car, CarStatus, Photo } from "@/lib/types";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCar(formData: FormData, existing?: Car): Omit<Car, "id" | "createdAt"> {
  const make = String(formData.get("make") ?? "").trim();
  const makeEn = String(formData.get("makeEn") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = Number(formData.get("year") ?? 0);
  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slugSource =
    !requestedSlug || /^https?:\/\//i.test(requestedSlug)
      ? `${makeEn || make}-${model}-${year}`
      : requestedSlug;
  const slug = slugify(slugSource) || uid("car");
  const photoUrls = String(formData.get("photoUrls") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const photos: Photo[] = photoUrls.map((url, index) => ({
    id: existing?.photos[index]?.id ?? uid("ph"),
    url,
    alt: existing?.photos[index]?.alt || `${make} ${model}`,
  }));
  const equipment = parseList(String(formData.get("equipment") ?? formData.get("options") ?? ""));

  return {
    slug,
    make,
    makeEn,
    model,
    year,
    price: Number(formData.get("price") ?? 0),
    mileage: Number(formData.get("mileage") ?? 0),
    color: String(formData.get("color") ?? "").trim(),
    interior: String(formData.get("interior") ?? "").trim(),
    engine: String(formData.get("engine") ?? "").trim(),
    displacement: String(formData.get("displacement") ?? "").trim(),
    horsepower: Number(formData.get("horsepower") ?? 0),
    transmission: String(formData.get("transmission") ?? "").trim(),
    drivetrain: String(formData.get("drivetrain") ?? "").trim(),
    doors: parseDoors(formData.get("doors")),
    bodyType: parseBodyType(formData.get("bodyType")),
    options: equipment,
    specs: parseSpecs(String(formData.get("specs") ?? "")),
    equipment,
    story: String(formData.get("story") ?? "").trim(),
    status: (String(formData.get("status") ?? "available") as CarStatus) || "available",
    published: formData.get("published") === "on" || formData.get("published") === "true",
    featured: formData.get("featured") === "on" || formData.get("featured") === "true",
    photos,
    updatedAt: new Date().toISOString(),
  };
}

export type CarFormResult = { error: string } | undefined;

function failure(error: unknown): { error: string } {
  const classified = classifyDbError(error);
  return { error: adminErrorMessage(classified.code, classified.detail) };
}

/** Returns an error for the form to display; on success the database has confirmed the write and we redirect. */
export async function createCar(formData: FormData): Promise<CarFormResult> {
  await requireAuth();
  let slug = "";
  try {
    const parsed = parseCar(formData);
    const saved = await saveCar(
      { ...parsed, id: uid("car"), createdAt: new Date().toISOString() },
      "create"
    );
    slug = saved.slug;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("createCar", error);
    return failure(error);
  }
  revalidatePublic(["/admin", "/admin/cars", `/cars/${slug}`]);
  redirect("/admin/cars?saved=1");
}

export async function updateCar(formData: FormData): Promise<CarFormResult> {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  let slug = "";
  try {
    const existing = await getAdminCar(id);
    if (!existing) return { error: "找不到這台車（可能已被刪除）。" };
    const parsed = parseCar(formData, existing);
    const saved = await saveCar({ ...existing, ...parsed }, "update");
    slug = saved.slug;
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("updateCar", error);
    return failure(error);
  }
  revalidatePublic(["/admin", "/admin/cars", `/cars/${slug}`]);
  redirect("/admin/cars?saved=1");
}

export async function togglePublish(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  let slug: string | null = null;
  try {
    slug = await setCarPublished(id, next === "1");
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("togglePublish", error);
    redirect(`/admin/cars?error=${classifyDbError(error).code}`);
  }
  revalidatePublic(["/admin", "/admin/cars", ...(slug ? [`/cars/${slug}`] : [])]);
  redirect("/admin/cars?saved=1");
}

export async function deleteCar(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  try {
    await removeCar(id);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("deleteCar", error);
    redirect(`/admin/cars?error=${classifyDbError(error).code}`);
  }
  revalidatePublic(["/admin", "/admin/cars"]);
  redirect("/admin/cars?saved=1");
}
