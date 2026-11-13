import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { unstable_cache } from "next/cache";
import { dirname, join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AdminDbError, classifyDbError } from "./admin-errors";
import { parseBodyType, parseDoors, parseStatus } from "./catalog";
import { safeImageUrl } from "./guards";
import { HEALTH_PROBE_STAFF_ID } from "./health";
import type { Admin, Car, Photo, SpecRow, Staff, Store } from "./types";
import { seedStore } from "./seed";
import { isAuthenticated } from "./session";
import {
  PUBLIC_DATA_TAG,
  isReadOnlyRuntime,
  logSupabasePublic,
  supabaseAdmin,
  supabaseAdminConfigured,
  supabaseAnonConfigured,
  supabaseConfigured,
  supabasePublic,
  supabaseWriteBlocker,
  withTimeout,
} from "./supabase";
export { uid } from "./id";

const STORE_PATH = join(process.cwd(), "data", "store.json");
let jsonCache: Store | null = null;

function emptyStore(): Store {
  return { admin: null, staff: [], cars: [], sessions: [] };
}

/** Local-file mode only. Throws instead of silently dropping the write. */
function persistJson(store: Store): void {
  if (isReadOnlyRuntime()) throw new AdminDbError("no_url");
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (error) {
    throw new AdminDbError("db", error instanceof Error ? error.message : "local file write failed");
  }
}

function getJsonStore(): Store {
  if (jsonCache) return jsonCache;
  if (isReadOnlyRuntime()) {
    jsonCache = emptyStore();
    return jsonCache;
  }
  try {
    if (!existsSync(STORE_PATH)) {
      jsonCache = seedStore(emptyStore());
      persistJson(jsonCache);
      return jsonCache;
    }
    const parsed = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
    jsonCache = {
      admin: parsed.admin ?? null,
      staff: parsed.staff ?? [],
      cars: (parsed.cars ?? []).map(normalizeCar),
      sessions: parsed.sessions ?? [],
    };
    return jsonCache;
  } catch (error) {
    console.error("json store read failed", error);
    jsonCache = emptyStore();
    return jsonCache;
  }
}

function rowToStaff(row: Record<string, unknown>): Staff {
  return {
    id: String(row.id),
    displayName: String(row.display_name ?? ""),
    role: String(row.role ?? ""),
    lineUrl: String(row.line_url ?? ""),
    lineId: String(row.line_id ?? ""),
    note: String(row.note ?? ""),
    lineUserId: String(row.line_user_id ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}

function staffRow(person: Staff) {
  return {
    id: person.id,
    display_name: person.displayName,
    role: person.role,
    line_url: person.lineUrl,
    line_id: person.lineId,
    note: person.note,
    line_user_id: person.lineUserId,
    sort_order: person.sortOrder,
    created_at: person.createdAt || new Date().toISOString(),
  };
}

function asPhotos(value: unknown): Photo[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const photo = item as Partial<Photo>;
      const url = safeImageUrl(String(photo.url ?? ""));
      if (!url) return null;
      return {
        id: String(photo.id ?? ""),
        url,
        alt: String(photo.alt ?? "").slice(0, 180),
      };
    })
    .filter((photo): photo is Photo => Boolean(photo));
}

function presentPublicStaff(person: Staff): Staff {
  return {
    ...person,
    lineUserId: "",
    lineUrl: person.lineUrl,
    note: person.note.slice(0, 500),
  };
}

function asSpecs(value: unknown): SpecRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const rec = row as { label?: unknown; value?: unknown };
      const label = String(rec.label ?? "").trim();
      if (!label) return null;
      return { label, value: String(rec.value ?? "") };
    })
    .filter((row): row is SpecRow => Boolean(row));
}

function normalizeCar(car: Partial<Car> & Record<string, unknown>): Car {
  const options = Array.isArray(car.options) ? car.options.map(String) : [];
  const equipment = Array.isArray(car.equipment) ? car.equipment.map(String) : options;
  return {
    id: String(car.id),
    slug: String(car.slug),
    make: String(car.make ?? ""),
    makeEn: String(car.makeEn ?? car.make_en ?? ""),
    model: String(car.model ?? ""),
    year: Number(car.year ?? 0),
    price: Number(car.price ?? 0),
    mileage: Number(car.mileage ?? 0),
    color: String(car.color ?? ""),
    interior: String(car.interior ?? ""),
    engine: String(car.engine ?? ""),
    displacement: String(car.displacement ?? car.engine ?? ""),
    horsepower: Number(car.horsepower ?? 0),
    transmission: String(car.transmission ?? ""),
    drivetrain: String(car.drivetrain ?? ""),
    doors: parseDoors(car.doors),
    bodyType: parseBodyType(car.bodyType ?? car.body_type),
    options,
    specs: asSpecs(car.specs),
    equipment,
    story: String(car.story ?? ""),
    status: parseStatus(car.status),
    published: Boolean(car.published),
    featured: Boolean(car.featured),
    photos: asPhotos(car.photos),
    createdAt: String(car.createdAt ?? car.created_at ?? ""),
    updatedAt: String(car.updatedAt ?? car.updated_at ?? ""),
  };
}

function rowToCar(row: Record<string, unknown>): Car {
  return normalizeCar(row);
}

function carRow(car: Car) {
  return {
    id: car.id,
    slug: car.slug,
    make: car.make,
    make_en: car.makeEn,
    model: car.model,
    year: Number.isFinite(car.year) ? car.year : new Date().getFullYear(),
    price: Number.isFinite(car.price) ? Math.round(car.price) : 0,
    mileage: Number.isFinite(car.mileage) ? car.mileage : 0,
    color: car.color,
    interior: car.interior,
    engine: car.engine,
    horsepower: Number.isFinite(car.horsepower) ? car.horsepower : 0,
    transmission: car.transmission,
    drivetrain: car.drivetrain,
    doors: car.doors,
    body_type: car.bodyType,
    displacement: car.displacement,
    options: car.options,
    specs: car.specs,
    equipment: car.equipment,
    story: car.story,
    status: car.status,
    published: car.published,
    featured: car.featured,
    photos: car.photos,
    created_at: car.createdAt,
    updated_at: car.updatedAt,
  };
}

/* ------------------------------------------------------------------ */
/* Public reads: fail-soft, but a failed read is never cached.         */
/* ------------------------------------------------------------------ */

const cachedPublishedCars = unstable_cache(
  async () => {
    if (!(supabaseAnonConfigured() || supabaseAdminConfigured())) return [] as Car[];
    const { data, error } = await withTimeout(
      supabasePublic()
        .from("rocky_cars")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
    );
    if (error) throw error;
    return (data ?? []).map((row) => rowToCar(row as Record<string, unknown>));
  },
  ["rocky-published-cars"],
  { revalidate: 60, tags: [PUBLIC_DATA_TAG] }
);

const PUBLIC_STAFF_COLUMNS =
  "id,display_name,role,line_url,line_id,note,sort_order,created_at";

const cachedPublicStaff = unstable_cache(
  async () => {
    if (!(supabaseAnonConfigured() || supabaseAdminConfigured())) return [] as Staff[];
    const { data, error } = await withTimeout(
      supabasePublic()
        .from("rocky_staff")
        .select(PUBLIC_STAFF_COLUMNS)
        .neq("id", HEALTH_PROBE_STAFF_ID)
        .order("sort_order")
    );
    if (error) throw error;
    return (data ?? []).map((row) => presentPublicStaff(rowToStaff(row as Record<string, unknown>)));
  },
  ["rocky-public-staff"],
  { revalidate: 60, tags: [PUBLIC_DATA_TAG] }
);

export async function listPublishedCars(): Promise<Car[]> {
  if (!supabaseConfigured()) return getJsonStore().cars.filter((car) => car.published);
  try {
    return await cachedPublishedCars();
  } catch (error) {
    logSupabasePublic("listPublishedCars", error);
    return [];
  }
}

export async function getPublishedCar(slug: string): Promise<Car | null> {
  return (await listPublishedCars()).find((car) => car.slug === slug) ?? null;
}

export async function listPublicStaff(): Promise<Staff[]> {
  if (!supabaseConfigured()) {
    return getJsonStore()
      .staff.filter((person) => person.id !== HEALTH_PROBE_STAFF_ID)
      .map(presentPublicStaff)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  try {
    return await cachedPublicStaff();
  } catch (error) {
    logSupabasePublic("listPublicStaff", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Admin reads/writes: strict. Every failure throws an AdminDbError.   */
/* ------------------------------------------------------------------ */

type Target = { kind: "supabase"; db: SupabaseClient } | { kind: "json" };

async function assertDeskSession(): Promise<void> {
  if (!(await isAuthenticated())) throw new AdminDbError("db", "unauthorized");
}

function adminTarget(): Target {
  const blocker = supabaseWriteBlocker();
  if (blocker) throw new AdminDbError(blocker);
  if (supabaseConfigured()) return { kind: "supabase", db: supabaseAdmin() };
  return { kind: "json" };
}

type DbResult<T> = { data: T | null; error: { message: string; code?: string } | null };

async function run<T>(work: PromiseLike<DbResult<T>>): Promise<T | null> {
  let res: DbResult<T>;
  try {
    res = await work;
  } catch (error) {
    throw classifyDbError(error);
  }
  if (res.error) throw classifyDbError(res.error);
  return res.data;
}

/** A write that touched no rows did not persist (RLS or wrong key can do this silently). */
function mustHaveRows(data: unknown[] | null): void {
  if (!data || data.length === 0) throw new AdminDbError("empty");
}

const ADMIN_CAR_LIST_COLUMNS =
  "id,slug,make,make_en,model,year,price,mileage,color,interior,engine,horsepower,transmission,drivetrain,doors,body_type,displacement,options,specs,equipment,story,status,published,featured,created_at,updated_at";

export async function listAdminCars(): Promise<Car[]> {
  if (!(await isAuthenticated())) return [];
  const target = adminTarget();
  if (target.kind === "json") return getJsonStore().cars;
  const data = await run<Record<string, unknown>[]>(
    target.db.from("rocky_cars").select(ADMIN_CAR_LIST_COLUMNS).order("created_at", { ascending: false })
  );
  return (data ?? []).map(rowToCar);
}

export async function listAdminStaff(): Promise<Staff[]> {
  if (!(await isAuthenticated())) return [];
  const target = adminTarget();
  if (target.kind === "json") return [...getJsonStore().staff].sort((a, b) => a.sortOrder - b.sortOrder);
  const data = await run<Record<string, unknown>[]>(
    target.db.from("rocky_staff").select("*").order("sort_order")
  );
  return (data ?? []).map(rowToStaff);
}

export async function getAdminCar(id: string): Promise<Car | null> {
  if (!(await isAuthenticated())) return null;
  const target = adminTarget();
  if (target.kind === "json") return getJsonStore().cars.find((car) => car.id === id) ?? null;
  const data = await run<Record<string, unknown>>(
    target.db.from("rocky_cars").select("*").eq("id", id).maybeSingle()
  );
  return data ? rowToCar(data) : null;
}

export async function getAdminRecord(): Promise<Admin | null> {
  const target = adminTarget();
  if (target.kind === "json") return getJsonStore().admin;
  const data = await run<{ password_hash: string; created_at: string }>(
    target.db.from("rocky_admin").select("*").eq("id", 1).maybeSingle()
  );
  return data ? { passwordHash: data.password_hash, createdAt: data.created_at } : null;
}

export async function saveAdminRecord(admin: Admin): Promise<void> {
  const target = adminTarget();
  if (target.kind === "json") {
    const store = getJsonStore();
    if (store.admin) throw new AdminDbError("db", "admin already exists");
    store.admin = admin;
    jsonCache = store;
    persistJson(store);
    return;
  }
  const data = await run<{ id: number }[]>(
    target.db
      .from("rocky_admin")
      .insert({ id: 1, password_hash: admin.passwordHash, created_at: admin.createdAt })
      .select("id")
  );
  mustHaveRows(data);
}

/** Insert or update one car. Returns the car as stored (slug may get a suffix on conflict). */
export async function saveCar(car: Car, mode: "create" | "update"): Promise<Car> {
  await assertDeskSession();
  const target = adminTarget();
  if (target.kind === "json") {
    const store = getJsonStore();
    let slug = car.slug;
    if (store.cars.some((item) => item.slug === slug && item.id !== car.id)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    const next = { ...car, slug };
    const index = store.cars.findIndex((item) => item.id === car.id);
    if (index >= 0) store.cars[index] = next;
    else store.cars.unshift(next);
    jsonCache = store;
    persistJson(store);
    return next;
  }

  let row = carRow(car);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let res: { data: { id: string; slug: string }[] | null; error: { message: string; code?: string } | null };
    try {
      const table = target.db.from("rocky_cars");
      res = await (mode === "create"
        ? table.insert(row).select("id,slug")
        : table.upsert(row, { onConflict: "id" }).select("id,slug"));
    } catch (error) {
      throw classifyDbError(error);
    }
    if (res.error?.code === "23505" && attempt === 0) {
      row = { ...row, slug: `${car.slug}-${Date.now().toString(36)}` };
      continue;
    }
    if (res.error) throw classifyDbError(res.error);
    mustHaveRows(res.data);
    return { ...car, slug: res.data![0].slug };
  }
  throw new AdminDbError("db", "slug conflict");
}

/** Returns the car slug (for revalidation), or null when a local-file car does not exist. */
export async function setCarPublished(id: string, published: boolean): Promise<string | null> {
  await assertDeskSession();
  const target = adminTarget();
  const updatedAt = new Date().toISOString();
  if (target.kind === "json") {
    const store = getJsonStore();
    const car = store.cars.find((item) => item.id === id);
    if (!car) return null;
    car.published = published;
    car.updatedAt = updatedAt;
    jsonCache = store;
    persistJson(store);
    return car.slug;
  }
  const data = await run<{ id: string; slug: string }[]>(
    target.db.from("rocky_cars").update({ published, updated_at: updatedAt }).eq("id", id).select("id,slug")
  );
  mustHaveRows(data);
  return data![0].slug;
}

export async function removeCar(id: string): Promise<void> {
  await assertDeskSession();
  const target = adminTarget();
  if (target.kind === "json") {
    const store = getJsonStore();
    store.cars = store.cars.filter((car) => car.id !== id);
    jsonCache = store;
    persistJson(store);
    return;
  }
  await run(target.db.from("rocky_cars").delete().eq("id", id));
}

export async function saveStaff(person: Staff): Promise<void> {
  await assertDeskSession();
  const target = adminTarget();
  if (target.kind === "json") {
    const store = getJsonStore();
    const index = store.staff.findIndex((item) => item.id === person.id);
    if (index >= 0) store.staff[index] = person;
    else store.staff.push(person);
    jsonCache = store;
    persistJson(store);
    return;
  }
  const data = await run<{ id: string }[]>(
    target.db.from("rocky_staff").upsert(staffRow(person), { onConflict: "id" }).select("id")
  );
  mustHaveRows(data);
}

export async function removeStaff(id: string): Promise<void> {
  await assertDeskSession();
  const target = adminTarget();
  if (target.kind === "json") {
    const store = getJsonStore();
    store.staff = store.staff.filter((person) => person.id !== id);
    jsonCache = store;
    persistJson(store);
    return;
  }
  await run(target.db.from("rocky_staff").delete().eq("id", id));
}
