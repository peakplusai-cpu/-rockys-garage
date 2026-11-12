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
          Rocky&apos;s Garage 員工入口。
        </p>
        {error === "invalid" ? <p className="flash">密碼不正確。</p> : null}
        {error === "rate" ? <p className="flash">嘗試次數過多，請稍後再試。</p> : null}
        {error === "session" ? (
          <p className="flash" role="alert">
            伺服器的 SESSION_SECRET 尚未設定，或仍是範例值。請換成一組未公開的密鑰後重新部署。
          </p>
        ) : null}
        {error && error !== "invalid" && error !== "rate" && error !== "session" ? (
          <p className="flash" role="alert">
            {adminErrorMessage(error)}
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
