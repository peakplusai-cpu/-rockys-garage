import { redirect } from "next/navigation";
import { setupAdmin } from "@/app/actions/auth";
import { adminErrorMessage } from "@/lib/admin-errors";
import { adminExists } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await adminExists()) redirect("/admin/login");
  const { error } = await searchParams;
  const message =
    error === "short"
      ? "密碼至少八碼。"
      : error === "long"
        ? "密碼過長。"
        : error === "weak"
          ? "請不要使用已公開的範例密碼。"
          : error === "mismatch"
            ? "兩次輸入不一致。"
            : error === "rate"
              ? "嘗試次數過多，請稍後再試。"
              : error === "session"
                ? "伺服器的 SESSION_SECRET 尚未設定，或仍是範例值。請換成一組未公開的密鑰後重新部署。"
                : error
                  ? adminErrorMessage(error)
                  : "";

  return (
    <main className="gate">
      <div className="gate-card reveal">
        <p className="engraved">First visit</p>
        <h1>設定密碼</h1>
        <p className="mute" style={{ lineHeight: 1.7, marginBottom: 32 }}>
          員工後台首次使用，請自行設定登入密碼。密碼以雜湊儲存，不會明文寫入。
        </p>
        {message ? <p className="flash">{message}</p> : null}
        <form action={setupAdmin}>
          <div className="field">
            <label htmlFor="password">密碼</label>
            <input id="password" name="password" type="password" minLength={8} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="confirm">再輸入一次</label>
            <input id="confirm" name="confirm" type="password" minLength={8} required />
          </div>
          <button className="btn" type="submit">
            建立並進入
          </button>
        </form>
      </div>
    </main>
  );
}
