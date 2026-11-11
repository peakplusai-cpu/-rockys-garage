import { runHealthWriteProbe } from "@/app/actions/health";
import { requireDeskAuth } from "@/lib/auth";
import { checkSupabaseHealth } from "@/lib/health";

export const dynamic = "force-dynamic";

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ probe?: string; msg?: string }>;
}) {
  await requireDeskAuth();
  const { probe, msg } = await searchParams;
  const report = await checkSupabaseHealth();

  return (
    <>
      <p className="engraved">Health</p>
      <h1>連線檢查</h1>
      <p className={report.connected ? "flash" : "flash flash-bad"} role={report.connected ? undefined : "alert"}>
        {report.summary}
      </p>
      {probe ? (
        <p className={probe === "ok" ? "flash" : "flash flash-bad"} role={probe === "ok" ? undefined : "alert"}>
          寫入測試：{msg}
        </p>
      ) : null}
      <table className="table">
        <thead>
          <tr>
            <th>項目</th>
            <th>狀態</th>
            <th>說明</th>
          </tr>
        </thead>
        <tbody>
          {report.checks.map((check) => (
            <tr key={check.id}>
              <td>{check.label}</td>
              <td>{check.ok ? "正常" : "異常"}</td>
              <td>{check.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form action={runHealthWriteProbe} style={{ marginTop: 28 }}>
        <p className="mute" style={{ maxWidth: 520, lineHeight: 1.7 }}>
          寫入測試會在 rocky_staff 新增一列暫存資料、讀回，然後立刻刪除，用來確認真的能寫進資料庫。
        </p>
        <button className="btn" type="submit" disabled={report.mode !== "supabase"}>
          執行寫入測試
        </button>
      </form>
    </>
  );
}
