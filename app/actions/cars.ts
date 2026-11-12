"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { parseBodyType, parseDoors, parseSpecs, parseStatus } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import { safeImageUrl } from "@/lib/guards";
import { uid } from "@/lib/id";
import { classifyDbError, isRedirectError, adminErrorMessage } from "@/lib/admin-errors";
import { getAdminCar, removeCar, saveCar, setCarPublished } from "@/lib/store";
import type { Car, Photo } from "@/lib/types";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 80);
}

function clip(value: FormDataEntryValue | null, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

function num(value: FormDataEntryValue | null, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function parseCar(formData: FormData, existing?: Car): Omit<Car, "id" | "createdAt"> {
  const make = clip(formData.get("make"), 80);
  const makeEn = clip(formData.get("makeEn"), 80);
  const model = clip(formData.get("model"), 80);
  const year = num(formData.get("year"), 1980, 2035, new Date().getFullYear());
  const requestedSlug = clip(formData.get("slug"), 80);
  const slugSource =
    !requestedSlug || /^https?:\/\//i.test(requestedSlug)
      ? `${makeEn || make}-${model}-${year}`
      : requestedSlug;
  const slug = slugify(slugSource) || uid("car");
  const photoUrls = String(formData.get("photoUrls") ?? "")
    .split("\n")
    .map((line) => safeImageUrl(line))
    .filter(Boolean)
    .slice(0, 30);
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
    price: num(formData.get("price"), 0, 1_000_000_000_000, 0),
    mileage: num(formData.get("mileage"), 0, 5_000_000, 0),
    color: clip(formData.get("color"), 80),
    interior: clip(formData.get("interior"), 80),
    engine: clip(formData.get("engine"), 120),
    displacement: clip(formData.get("displacement"), 40),
    horsepower: num(formData.get("horsepower"), 0, 5000, 0),
    transmission: clip(formData.get("transmission"), 40),
    drivetrain: clip(formData.get("drivetrain"), 40),
    doors: parseDoors(formData.get("doors")),
    bodyType: parseBodyType(formData.get("bodyType")),
    options: equipment,
    specs: parseSpecs(String(formData.get("specs") ?? "")).slice(0, 40),
    equipment,
    story: clip(formData.get("story"), 8000),
    status: parseStatus(formData.get("status")),
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
