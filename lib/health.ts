import { adminErrorMessage, classifyDbError } from "./admin-errors";
import { resolveSessionSecret } from "./guards";
import {
  supabaseAdmin,
  supabaseConfigured,
  supabaseEnvReport,
  supabasePublic,
  supabaseWriteBlocker,
} from "./supabase";

/** Thrown away during the write probe. Public staff queries must ignore this id. */
export const HEALTH_PROBE_STAFF_ID = "__health_probe__";

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

export function probeLabel(code: string | undefined): string {
  if (code === "ok") return "寫入、讀回、刪除測試都成功，資料庫可正常保存。";
  if (code === "local") return "目前是本機檔案模式，沒有連到資料庫，無法測試 Supabase 寫入。";
  if (code === "cleanup") return "寫入成功但清除測試資料失敗，請到 rocky_staff 刪除測試列。";
  if (!code || code === "fail") return "寫入測試沒有成功。請依上方連線檢查處理。";
  return adminErrorMessage(code);
}

const KEY_LABEL = { none: "未設定", service: "service_role", anon: "anon／publishable", unknown: "無法辨識" } as const;

/** Read-only checks. Never mutates data, never returns secret values. */
export async function checkSupabaseHealth(): Promise<HealthReport> {
  const env = supabaseEnvReport();
  const blocker = supabaseWriteBlocker();
  const sessionReady = Boolean(resolveSessionSecret());
  const checks: HealthCheck[] = [
    {
      id: "session-secret",
      label: "SESSION_SECRET",
      ok: sessionReady,
      message: sessionReady
        ? process.env.NODE_ENV === "production"
          ? "OK"
          : "本機可使用開發用密鑰。正式環境必須另設一組未公開的 SESSION_SECRET，否則後台無法登入。"
        : "正式環境的 SESSION_SECRET 缺失或仍是範例值，後台登入會被拒絕。",
    },
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

  if (!env.urlSet && !env.readOnlyRuntime) {
    return {
      mode: "local-file",
      connected: false,
      summary: "未連接 Supabase：目前資料只寫在本機檔案（data/*.json），部署或重啟後會遺失。",
      checks,
    };
  }

  if (blocker) {
    return {
      mode: "blocked",
      connected: false,
      summary: `未連接資料庫，後台無法保存資料。${adminErrorMessage(blocker)}`,
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

/** Real write round-trip: insert, read back, delete a throwaway rocky_staff row. */
export async function runWriteProbe(): Promise<{ ok: boolean; code: string }> {
  const blocker = supabaseWriteBlocker();
  if (blocker) return { ok: false, code: blocker };
  if (!supabaseConfigured()) return { ok: false, code: "local" };
  const db = supabaseAdmin(HEALTH_MS);
  try {
    const up = await db
      .from("rocky_staff")
      .upsert(
        { id: HEALTH_PROBE_STAFF_ID, display_name: "health", role: "probe", sort_order: 9999 },
        { onConflict: "id" }
      )
      .select("id");
    if (up.error) throw up.error;
    if (!up.data?.length) return { ok: false, code: "empty" };
    const back = await db.from("rocky_staff").select("id").eq("id", HEALTH_PROBE_STAFF_ID);
    if (back.error) throw back.error;
    const del = await db.from("rocky_staff").delete().eq("id", HEALTH_PROBE_STAFF_ID).select("id");
    if (del.error) return { ok: false, code: "cleanup" };
    return back.data?.length ? { ok: true, code: "ok" } : { ok: false, code: "empty" };
  } catch (error) {
    return { ok: false, code: classifyDbError(error).code };
  }
}
