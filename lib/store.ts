import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { unstable_cache } from "next/cache";
import { dirname, join } from "path";
import { parseBodyType, parseDoors } from "./catalog";
import type { Admin, Car, SpecRow, Staff, Store } from "./types";
import { seedStore } from "./seed";
import { isAuthenticated } from "./session";
import {
  PUBLIC_DATA_TAG,
  failSoft,
  isReadOnlyRuntime,
  supabaseAdmin,
  supabaseAdminConfigured,
  supabaseAnonConfigured,
  supabaseConfigured,
  supabasePublic,
} from "./supabase";
export { uid } from "./id";

const STORE_PATH = join(process.cwd(), "data", "store.json");
let jsonCache: Store | null = null;

function emptyStore(): Store {
  return { admin: null, staff: [], cars: [], sessions: [] };
}

function persistJson(store: Store): void {
  if (isReadOnlyRuntime()) return;
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    const tmp = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    renameSync(tmp, STORE_PATH);
  } catch (error) {
    console.error("json store persist skipped", error);
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
    status: (car.status as Car["status"]) || "available",
    published: Boolean(car.published),
    featured: Boolean(car.featured),
    photos: Array.isArray(car.photos) ? (car.photos as Car["photos"]) : [],
    createdAt: String(car.createdAt ?? car.created_at ?? ""),
    updatedAt: String(car.updatedAt ?? car.updated_at ?? ""),
  };
}

function rowToCar(row: Record<string, unknown>): Car {
  return normalizeCar(row);
}

async function getSupabaseStore(): Promise<Store> {
  const db = supabaseAdmin();
  const results = await failSoft(
    Promise.all([
      db.from("rocky_admin").select("*").eq("id", 1).maybeSingle(),
      db.from("rocky_staff").select("*").order("sort_order"),
      db.from("rocky_cars").select("*").order("created_at", { ascending: false }),
    ]),
    null
  );
  if (!results) throw new Error("資料庫連線逾時，請再試一次。");
  const [adminRes, staffRes, carsRes] = results;
  if (carsRes.error) throw new Error(carsRes.error.message || "讀取車輛失敗");
  if (staffRes.error) console.error("supabase staff", staffRes.error);
  if (adminRes.error) console.error("supabase admin", adminRes.error);
  const adminRow = adminRes.data as { password_hash: string; created_at: string } | null;
  const admin: Admin | null = adminRow
    ? { passwordHash: adminRow.password_hash, createdAt: adminRow.created_at }
    : null;
  return {
    admin,
    staff: (staffRes.data ?? []).map((row) => rowToStaff(row as Record<string, unknown>)),
    cars: (carsRes.data ?? []).map((row) => rowToCar(row as Record<string, unknown>)),
    sessions: [],
  };
}

async function saveSupabaseStore(store: Store): Promise<void> {
  const db = supabaseAdmin();
  if (store.admin) {
    const { error } = await db.from("rocky_admin").upsert({
      id: 1,
      password_hash: store.admin.passwordHash,
      created_at: store.admin.createdAt,
    });
    if (error) throw error;
  }
  if (store.staff.length) {
    const { error: staffErr } = await db.from("rocky_staff").upsert(
      store.staff.map((person) => ({
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
    if (staffErr) throw staffErr;
  }
  const remoteStaff = await db.from("rocky_staff").select("id");
  const keepStaff = new Set(store.staff.map((s) => s.id));
  const extraStaff = (remoteStaff.data ?? []).map((r) => r.id).filter((id) => !keepStaff.has(id));
  if (extraStaff.length) await db.from("rocky_staff").delete().in("id", extraStaff);

  const { error: carsErr } = await db.from("rocky_cars").upsert(
    store.cars.map((car) => ({
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
    }))
  );
  if (carsErr) throw carsErr;
  const remoteCars = await db.from("rocky_cars").select("id");
  const keepCars = new Set(store.cars.map((c) => c.id));
  const extraCars = (remoteCars.data ?? []).map((r) => r.id).filter((id) => !keepCars.has(id));
  if (extraCars.length) await db.from("rocky_cars").delete().in("id", extraCars);
}

export async function getStore(): Promise<Store> {
  if (supabaseConfigured()) {
    try {
      if (supabaseAdminConfigured()) return await getSupabaseStore();
      const [published, staff] = await Promise.all([listPublishedCars(), listPublicStaff()]);
      return { admin: null, staff, cars: published, sessions: [] };
    } catch (error) {
      console.error("supabase getStore", error);
      throw error;
    }
  }
  return getJsonStore();
}

const cachedPublishedCars = unstable_cache(
  async () => {
    if (!(supabaseAnonConfigured() || supabaseAdminConfigured())) return [] as Car[];
    return failSoft(
      supabasePublic()
        .from("rocky_cars")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("supabase listPublishedCars", error);
            return [] as Car[];
          }
          return (data ?? []).map((row) => rowToCar(row as Record<string, unknown>));
        }),
      [] as Car[]
    );
  },
  ["rocky-published-cars"],
  { revalidate: 60, tags: [PUBLIC_DATA_TAG] }
);

const cachedPublicStaff = unstable_cache(
  async () => {
    if (!(supabaseAnonConfigured() || supabaseAdminConfigured())) return [] as Staff[];
    return failSoft(
      supabasePublic()
        .from("rocky_staff")
        .select("*")
        .order("sort_order")
        .then(({ data, error }) => {
          if (error) {
            console.error("supabase listPublicStaff", error);
            return [] as Staff[];
          }
          return (data ?? []).map((row) => rowToStaff(row as Record<string, unknown>));
        }),
      [] as Staff[]
    );
  },
  ["rocky-public-staff"],
  { revalidate: 60, tags: [PUBLIC_DATA_TAG] }
);

export async function listPublishedCars(): Promise<Car[]> {
  if (supabaseConfigured()) return cachedPublishedCars();
  return getJsonStore().cars.filter((car) => car.published);
}

export async function getPublishedCar(slug: string): Promise<Car | null> {
  return (await listPublishedCars()).find((car) => car.slug === slug) ?? null;
}

export async function listPublicStaff(): Promise<Staff[]> {
  if (supabaseConfigured()) return cachedPublicStaff();
  return [...getJsonStore().staff].sort((a, b) => a.sortOrder - b.sortOrder);
}

const WRITE_MS = 12000;

/** List columns omit photos JSON so desk counts/tables do not pull the full inventory blob. */
const ADMIN_CAR_LIST_COLUMNS =
  "id,slug,make,make_en,model,year,price,mileage,color,interior,engine,horsepower,transmission,drivetrain,doors,body_type,displacement,options,specs,equipment,story,status,published,featured,created_at,updated_at";

export async function listAdminCars(): Promise<Car[]> {
  if (!(await isAuthenticated())) return [];
  if (!supabaseConfigured()) return getJsonStore().cars;
  if (!supabaseAdminConfigured()) return failSoft(listPublishedCars(), [] as Car[]);
  const db = supabaseAdmin();
  return failSoft(
    db
      .from("rocky_cars")
      .select(ADMIN_CAR_LIST_COLUMNS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("supabase listAdminCars", error);
          return [] as Car[];
        }
        return (data ?? []).map((row) => rowToCar(row as Record<string, unknown>));
      }),
    [] as Car[]
  );
}

export async function listAdminStaff(): Promise<Staff[]> {
  if (!(await isAuthenticated())) return [];
  if (!supabaseConfigured()) {
    return [...getJsonStore().staff].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  if (!supabaseAdminConfigured()) return failSoft(listPublicStaff(), [] as Staff[]);
  const db = supabaseAdmin();
  return failSoft(
    db
      .from("rocky_staff")
      .select("*")
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) {
          console.error("supabase listAdminStaff", error);
          return [] as Staff[];
        }
        return (data ?? []).map((row) => rowToStaff(row as Record<string, unknown>));
      }),
    [] as Staff[]
  );
}

export async function getAdminCar(id: string): Promise<Car | null> {
  if (!(await isAuthenticated())) return null;
  if (!supabaseConfigured()) {
    return getJsonStore().cars.find((car) => car.id === id) ?? null;
  }
  if (!supabaseAdminConfigured()) {
    const published = await listPublishedCars();
    return published.find((car) => car.id === id) ?? null;
  }
  const db = supabaseAdmin();
  return failSoft(
    db
      .from("rocky_cars")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("supabase getAdminCar", error);
          return null;
        }
        return data ? rowToCar(data as Record<string, unknown>) : null;
      }),
    null
  );
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

/** Insert one car. Does not read or rewrite the rest of the inventory. */
export async function insertCar(car: Car): Promise<void> {
  if (!supabaseConfigured()) {
    const store = getJsonStore();
    store.cars.unshift(car);
    jsonCache = store;
    persistJson(store);
    return;
  }
  if (!supabaseAdminConfigured()) {
    throw new Error("後台寫入需要 SUPABASE_SERVICE_ROLE_KEY");
  }
  const db = supabaseAdmin(WRITE_MS);
  try {
    let row = carRow(car);
    let { error } = await db.from("rocky_cars").insert(row);
    if (error?.code === "23505") {
      row = { ...row, slug: `${car.slug}-${Date.now().toString(36)}` };
      ({ error } = await db.from("rocky_cars").insert(row));
    }
    if (error) throw new Error(error.message || "新增車輛失敗");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unreachable|fetch failed|ENOTFOUND|aborted|timeout/i.test(message)) {
      throw new Error("資料庫連不到。請在 Vercel 設定 Rocky's Garage 的 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 後 Redeploy。");
    }
    throw error;
  }
}

export async function saveStore(store: Store): Promise<void> {
  if (supabaseAdminConfigured()) {
    await saveSupabaseStore(store);
    return;
  }
  if (supabaseConfigured()) {
    throw new Error("Admin writes need SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
  }
  jsonCache = store;
  persistJson(store);
}
