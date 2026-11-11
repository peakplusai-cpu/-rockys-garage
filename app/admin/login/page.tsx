import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/actions/auth";
import { adminErrorMessage } from "@/lib/admin-errors";
import { adminExists } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await adminExists())) redirect("/admin/setup");
  const { error } = await searchParams;

  return (
    <main className="gate">
      <div className="gate-card reveal">
        <p className="engraved">Staff</p>
        <h1>登入</h1>
        <p className="mute" style={{ marginBottom: 32 }}>
          Rocky&apos;s Garage 員工入口。預設密碼見專案 README（ADMIN_PASSWORD）。
        </p>
        {error === "invalid" ? <p className="flash">密碼不正確。</p> : null}
        {error && error !== "invalid" ? (
          <p className="flash" role="alert">
            {adminErrorMessage(error)} 也可以在環境變數設定 ADMIN_PASSWORD 後重新部署，直接用該密碼登入。
          </p>
        ) : null}
        <form action={loginAdmin}>
          <div className="field">
            <label htmlFor="password">密碼</label>
            <input id="password" name="password" type="password" required autoFocus />
          </div>
          <button className="btn" type="submit">
            進入後台
          </button>
        </form>
      </div>
    </main>
  );
}
