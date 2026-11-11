"use server";

import { revalidatePublic } from "@/lib/revalidate-public";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { parseBodyType, parseDoors, parseSpecs } from "@/lib/catalog";
import { slugify } from "@/lib/format";
import { uid } from "@/lib/id";
import { getStore, insertCar, saveStore } from "@/lib/store";
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

function rethrowRedirect(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

export async function createCar(formData: FormData) {
  await requireAuth();
  try {
    const parsed = parseCar(formData);
    await insertCar({
      ...parsed,
      id: uid("car"),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    rethrowRedirect(error);
    console.error("createCar", error);
    redirect("/admin/cars/new?error=save");
  }
  revalidatePublic(["/admin"]);
  redirect("/admin/cars");
}

export async function updateCar(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  const index = store.cars.findIndex((car) => car.id === id);
  if (index === -1) redirect("/admin/cars");
  const existing = store.cars[index];
  const parsed = parseCar(formData, existing);
  if (store.cars.some((car) => car.slug === parsed.slug && car.id !== id)) {
    parsed.slug = `${parsed.slug}-${uid("x").slice(-4)}`;
  }
  store.cars[index] = {
    ...existing,
    ...parsed,
  };
  await saveStore(store);
  revalidatePublic([`/cars/${parsed.slug}`, "/admin/cars"]);
  redirect("/admin/cars");
}

export async function togglePublish(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  const store = await getStore();
  const car = store.cars.find((item) => item.id === id);
  if (car) {
    car.published = next === "1" ? true : next === "0" ? false : !car.published;
    car.updatedAt = new Date().toISOString();
    await saveStore(store);
  }
  revalidatePublic(["/admin", "/admin/cars"]);
}

export async function deleteCar(formData: FormData) {
  await requireAuth();
  const id = String(formData.get("id") ?? "");
  const store = await getStore();
  store.cars = store.cars.filter((car) => car.id !== id);
  await saveStore(store);
  revalidatePublic(["/admin/cars"]);
  redirect("/admin/cars");
}
