import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const demoPath = join(root, "supabase", "demo-seed.json");
const storePath = join(root, "data", "store.json");
const settingsPath = join(root, "data", "settings.json");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  process.exit(1);
}

const demo = existsSync(demoPath) ? JSON.parse(readFileSync(demoPath, "utf8")) : { cars: [], staff: [], settings: {} };
const local = existsSync(storePath) ? JSON.parse(readFileSync(storePath, "utf8")) : null;
const localSettings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf8")) : {};

const cars = (local?.cars?.length ? local.cars : demo.cars).filter(
  (car) => car?.slug && !String(car.slug).startsWith("http")
);
const staff = local?.staff?.length ? local.staff : demo.staff;
const settings = {
  lineUrl: localSettings.lineUrl || demo.settings?.lineUrl || process.env.NEXT_PUBLIC_LINE_URL || "",
  instagramUrl:
    localSettings.instagramUrl || demo.settings?.instagramUrl || process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
};

const db = createClient(url, key, { auth: { persistSession: false } });

if (local?.admin) {
  const { error } = await db.from("rocky_admin").upsert({
    id: 1,
    password_hash: local.admin.passwordHash,
    created_at: local.admin.createdAt,
  });
  if (error) throw error;
}

if (staff.length) {
  const { error } = await db.from("rocky_staff").upsert(
    staff.map((person) => ({
      id: person.id,
      display_name: person.displayName,
      role: person.role,
      line_url: person.lineUrl,
      line_id: person.lineId,
      note: person.note,
      line_user_id: person.lineUserId,
      sort_order: person.sortOrder,
      created_at: person.createdAt,
    }))
  );
  if (error) throw error;
}

const { error: carsErr } = cars.length ? await db.from("rocky_cars").upsert(
  cars.map((car) => ({
    id: car.id,
    slug: car.slug,
    make: car.make,
    make_en: car.makeEn,
    model: car.model,
    year: car.year,
    price: car.price,
    mileage: car.mileage,
    color: car.color,
    interior: car.interior,
    engine: car.engine,
    horsepower: car.horsepower,
    transmission: car.transmission,
    drivetrain: car.drivetrain,
    doors: car.doors,
    body_type: car.bodyType,
    displacement: car.displacement,
    options: car.options ?? [],
    specs: car.specs ?? [],
    equipment: car.equipment ?? [],
    story: car.story,
    status: car.status,
    published: car.published,
    featured: car.featured,
    photos: car.photos,
    created_at: car.createdAt,
    updated_at: car.updatedAt,
  }))
) : { error: null };
if (carsErr) throw carsErr;

const { error: setErr } = await db.from("rocky_site_settings").upsert({
  id: 1,
  instagram: "",
  line_url: settings.lineUrl,
  instagram_url: settings.instagramUrl,
  updated_at: new Date().toISOString(),
});
if (setErr) throw setErr;

console.log("seeded", cars.length, "cars", staff.length, "staff");
