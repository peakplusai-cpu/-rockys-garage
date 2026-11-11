import { deleteStaff, upsertStaff } from "@/app/actions/staff";
import { requireDeskAuth } from "@/lib/auth";
import { listAdminStaff } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ bound?: string; error?: string }>;
}) {
  await requireDeskAuth();
  const { bound, error } = await searchParams;
  const staff = await listAdminStaff();

  return (
    <>
      <p className="engraved">LINE</p>
      <h1>顧問帳號</h1>
      <p className="mute" style={{ maxWidth: 480, lineHeight: 1.7, marginBottom: 28 }}>
        每位業務請填 LINE 官方帳號的 Basic ID（一定要有 @，例如
        @carhouse）。客戶用手機點擊會直接打開 LINE App
        加好友並進入聊天室；電腦瀏覽器仍會顯示 QR，那是 LINE 網頁本身的限制。
      </p>
      {bound ? <p className="flash">LINE 聯絡資料已更新。</p> : null}
      {error ? <p className="flash">LINE 聯絡資料未完成，請確認官方帳號 ID 或網址。</p> : null}
      {!staff.length ? (
        <p className="empty-line">尚未設定任何真實業務 LINE。新增後才會公開顯示。</p>
      ) : null}

      {staff.map((person) => (
        <form action={upsertStaff} key={person.id} style={{ marginBottom: 36 }}>
          <input type="hidden" name="id" value={person.id} />
          <div className="form-grid">
            <div className="field">
              <label>顯示名稱</label>
              <input name="displayName" required defaultValue={person.displayName} />
            </div>
            <div className="field">
              <label>職稱</label>
              <input name="role" required defaultValue={person.role} />
            </div>
            <div className="field">
              <label>LINE 官方帳號 ID</label>
              <input name="lineId" defaultValue={person.lineId} placeholder="@yourbrand" />
            </div>
            <div className="field">
              <label>官方加好友網址</label>
              <input name="lineUrl" defaultValue={person.lineUrl} placeholder="https://lin.ee/..." />
            </div>
            <div className="field">
              <label>備註</label>
              <input name="note" defaultValue={person.note} />
            </div>
            <div className="field">
              <label>排序</label>
              <input name="sortOrder" type="number" defaultValue={person.sortOrder} />
            </div>
          </div>
          <div className="row-actions">
            <button className="btn" type="submit">
              更新
            </button>
            <button className="btn btn-ghost" type="submit" formAction={deleteStaff}>
              移除
            </button>
          </div>
        </form>
      ))}

      <h2 className="display" style={{ fontSize: 32, margin: "56px 0 20px" }}>
        新增顧問
      </h2>
      <form action={upsertStaff}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="displayName">顯示名稱</label>
            <input id="displayName" name="displayName" required />
          </div>
          <div className="field">
            <label htmlFor="role">職稱</label>
            <input id="role" name="role" required />
          </div>
          <div className="field">
            <label htmlFor="lineId">LINE 官方帳號 ID</label>
            <input id="lineId" name="lineId" placeholder="@yourbrand" />
          </div>
          <div className="field">
            <label htmlFor="lineUrl">官方加好友網址</label>
            <input id="lineUrl" name="lineUrl" placeholder="https://lin.ee/..." />
          </div>
          <div className="field wide">
            <label htmlFor="note">備註</label>
            <input id="note" name="note" />
          </div>
        </div>
        <button className="btn" type="submit">
          新增
        </button>
      </form>
    </>
  );
}
