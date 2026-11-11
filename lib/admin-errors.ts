export type AdminErrorCode =
  | "no_url"
  | "bad_url"
  | "no_key"
  | "wrong_key"
  | "url"
  | "network"
  | "schema"
  | "rls"
  | "key"
  | "empty"
  | "db";

export class AdminDbError extends Error {
  code: AdminErrorCode;
  detail: string;

  constructor(code: AdminErrorCode, detail = "") {
    super(detail || code);
    this.name = "AdminDbError";
    this.code = code;
    this.detail = detail;
  }
}

const MESSAGES: Record<AdminErrorCode, string> = {
  no_url:
    "尚未設定 NEXT_PUBLIC_SUPABASE_URL，網站沒有連到資料庫，所以資料「不會」被保存。請在 Vercel 設定環境變數後重新部署。",
  bad_url: "NEXT_PUBLIC_SUPABASE_URL 格式不正確，必須是 https://<專案代號>.supabase.co（不能是網站網址或結尾多餘路徑）。",
  no_key: "尚未設定 SUPABASE_SERVICE_ROLE_KEY（或 SUPABASE_SECRET_KEY），後台無法寫入資料庫。",
  wrong_key:
    "SUPABASE_SERVICE_ROLE_KEY 填成了 anon／publishable 金鑰。請改填 service_role（或 sb_secret_…）金鑰，否則寫入會被資料庫擋下。",
  url: "NEXT_PUBLIC_SUPABASE_URL 回傳的是網頁而不是 Supabase API，網址大概填錯了。",
  network: "連不上 Supabase（逾時、網址或網路錯誤）。請檢查 NEXT_PUBLIC_SUPABASE_URL 與 Supabase 專案是否暫停。",
  schema: "資料庫裡找不到 rocky_* 資料表。請到 Supabase SQL Editor 執行 supabase/schema.sql。",
  rls: "資料庫拒絕寫入（權限／RLS）。請確認使用 service_role 金鑰，且已執行 supabase/schema.sql。",
  key: "Supabase 金鑰無效（Invalid API key）。請重新複製 service_role 金鑰到環境變數。",
  empty: "資料庫沒有回報任何寫入結果，資料可能沒有存進去。請檢查金鑰與 rocky_* 資料表。",
  db: "資料庫寫入失敗。",
};

export function adminErrorMessage(code: string | undefined | null, detail = ""): string {
  if (!code) return "";
  const known = MESSAGES[code as AdminErrorCode];
  if (!known) return "儲存失敗，請稍後再試。";
  return code === "db" && detail ? `${known}（${detail.slice(0, 160)}）` : known;
}

/** Map any thrown value (PostgREST error, fetch failure, our own errors) to a stable code. */
export function classifyDbError(error: unknown): AdminDbError {
  if (error instanceof AdminDbError) return error;
  const err = error as { code?: string; message?: string; details?: string; status?: number } | null;
  const message = String(err?.message || err?.details || error || "");
  const code = String(err?.code || "");

  if (/supabase html response/i.test(message)) return new AdminDbError("url", message);
  if (code === "PGRST205" || code === "42P01" || /could not find the table|relation .* does not exist/i.test(message)) {
    return new AdminDbError("schema", message);
  }
  if (code === "42501" || /row-level security|permission denied/i.test(message)) {
    return new AdminDbError("rls", message);
  }
  if (code === "PGRST301" || code === "PGRST302" || /invalid api key|jwt|no api key/i.test(message)) {
    return new AdminDbError("key", message);
  }
  if (/unreachable|fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|aborted|timeout|network/i.test(message)) {
    return new AdminDbError("network", message);
  }
  return new AdminDbError("db", message);
}

export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

/** For desk pages: never throw, always return what to show. */
export async function attempt<T>(
  work: () => Promise<T>,
  fallback: T
): Promise<{ data: T; error: AdminDbError | null }> {
  try {
    return { data: await work(), error: null };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { data: fallback, error: classifyDbError(error) };
  }
}
