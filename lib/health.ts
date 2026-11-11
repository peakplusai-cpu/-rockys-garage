import { adminErrorMessage, classifyDbError } from "./admin-errors";
import {
  supabaseAdmin,
  supabaseConfigured,
  supabaseEnvReport,
  supabasePublic,
  supabaseWriteBlocker,
} from "./supabase";

export type HealthCheck = { id: string; label: string; ok: boolean; message: string };

export type HealthReport = {
  /** supabase = real database; local-file = JSON on disk (lost on redeploy); blocked = cannot save at all */
  mode: "supabase" | "local-file" | "blocked";
  connected: boolean;
  summary: string;
  checks: HealthCheck[];
};

const TABLES = ["rocky_admin", "rocky_staff", "rocky_cars", "rocky_site_settings"] as const;
const HEALTH_MS = 5000;

const KEY_LABEL = { none: "未設定", service: "service_role", anon: "anon／publishable", unknown: "無法辨識" } as const;

/** Read-only checks. Never mutates data, never returns secret values. */
export async function checkSupabaseHealth(): Promise<HealthReport> {
  const env = supabaseEnvReport();
  const blocker = supabaseWriteBlocker();
  const checks: HealthCheck[] = [
    {
      id: "url",
      label: "NEXT_PUBLIC_SUPABASE_URL",
      ok: env.urlValid,
      message: !env.urlSet
        ? "未設定"
        : env.urlValid
          ? `OK（${env.urlHost}）`
          : "格式不正確，必須是 https://<專案代號>.supabase.co",
    },
    {
      id: "service-key",
      label: "SUPABASE_SERVICE_ROLE_KEY",
      ok: env.serviceKey === "service" || env.serviceKey === "unknown",
      message:
        env.serviceKey === "service"
          ? "OK（service_role 金鑰）"
          : env.serviceKey === "unknown"
            ? "已設定，但無法判斷角色，請以下方檢查結果為準"
            : `目前是：${KEY_LABEL[env.serviceKey]}。後台寫入需要 service_role（或 sb_secret_…）`,
    },
    {
      id: "anon-key",
      label: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ok: env.anonKey !== "none",
      message:
        env.anonKey === "none"
          ? "未設定（公開頁會改用 service key 讀取，建議補上 anon／publishable 金鑰）"
          : `OK（${KEY_LABEL[env.anonKey]}）`,
    },
  ];

  if (blocker) {
    const local = !env.urlSet && !env.readOnlyRuntime;
    return {
      mode: local ? "local-file" : "blocked",
      connected: false,
      summary: local
        ? "未連接 Supabase：目前資料只寫在本機檔案（data/*.json），部署或重啟後會遺失。"
        : `未連接資料庫，後台無法保存資料。${adminErrorMessage(blocker)}`,
      checks,
    };
  }

  if (!supabaseConfigured()) {
    return { mode: "blocked", connected: false, summary: adminErrorMessage("bad_url"), checks };
  }

  const db = supabaseAdmin(HEALTH_MS);
  for (const table of TABLES) {
    try {
      const { count, error } = await db.from(table).select("*", { count: "exact" }).limit(1);
      checks.push({
        id: `table-${table}`,
        label: `資料表 ${table}`,
        ok: !error,
        message: error ? adminErrorMessage(classifyDbError(error).code, error.message) : `OK（${count ?? 0} 筆）`,
      });
    } catch (error) {
      const c = classifyDbError(error);
      checks.push({ id: `table-${table}`, label: `資料表 ${table}`, ok: false, message: adminErrorMessage(c.code, c.detail) });
    }
  }

  try {
    const { error } = await db.storage.getBucket("rocky-uploads");
    checks.push({
      id: "bucket",
      label: "Storage bucket rocky-uploads",
      ok: !error,
      message: error ? "找不到 bucket。請執行 supabase/schema.sql（會建立 rocky-uploads）。" : "OK",
    });
  } catch (error) {
    const c = classifyDbError(error);
    checks.push({ id: "bucket", label: "Storage bucket rocky-uploads", ok: false, message: adminErrorMessage(c.code, c.detail) });
  }

  try {
    const { error } = await supabasePublic().from("rocky_cars").select("id", { count: "exact" }).limit(1);
    checks.push({
      id: "public-read",
      label: "公開讀取（anon，前台用）",
      ok: !error,
      message: error ? adminErrorMessage(classifyDbError(error).code, error.message) : "OK",
    });
  } catch (error) {
    const c = classifyDbError(error);
    checks.push({ id: "public-read", label: "公開讀取（anon，前台用）", ok: false, message: adminErrorMessage(c.code, c.detail) });
  }

  const ok = checks.every((check) => check.ok);
  return {
    mode: "supabase",
    connected: ok,
    summary: ok ? "已連接 Supabase，資料表與權限正常。" : "已設定 Supabase，但有項目未通過，請依下方訊息處理。",
    checks,
  };
}

const PROBE_ID = "__health_probe__";

/** Real write round-trip: insert, read back, delete a throwaway rocky_staff row. */
export async function runWriteProbe(): Promise<{ ok: boolean; message: string }> {
  const blocker = supabaseWriteBlocker();
  if (blocker) return { ok: false, message: adminErrorMessage(blocker) };
  if (!supabaseConfigured()) {
    return { ok: false, message: "目前是本機檔案模式，沒有連到資料庫，無法測試 Supabase 寫入。" };
  }
  const db = supabaseAdmin(HEALTH_MS);
  try {
    const up = await db
      .from("rocky_staff")
      .upsert({ id: PROBE_ID, display_name: "health", role: "probe", sort_order: 9999 }, { onConflict: "id" })
      .select("id");
    if (up.error) throw up.error;
    if (!up.data?.length) return { ok: false, message: adminErrorMessage("empty") };
    const back = await db.from("rocky_staff").select("id").eq("id", PROBE_ID);
    if (back.error) throw back.error;
    const del = await db.from("rocky_staff").delete().eq("id", PROBE_ID).select("id");
    if (del.error) {
      return { ok: false, message: `寫入成功但清除測試資料失敗，請到 rocky_staff 刪除 id=${PROBE_ID} 那列。` };
    }
    return back.data?.length
      ? { ok: true, message: "寫入、讀回、刪除測試都成功，資料庫可正常保存。" }
      : { ok: false, message: "寫入後讀不回資料，請檢查金鑰與 RLS。" };
  } catch (error) {
    const c = classifyDbError(error);
    return { ok: false, message: adminErrorMessage(c.code, c.detail) };
  }
}
