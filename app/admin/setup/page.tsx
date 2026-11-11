import { redirect } from "next/navigation";
import { setupAdmin } from "@/app/actions/auth";
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
    error === "short" ? "密碼至少八碼。" : error === "mismatch" ? "兩次輸入不一致。" : "";

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
