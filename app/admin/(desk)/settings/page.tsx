import { saveContacts } from "@/app/actions/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { adminErrorMessage, attempt } from "@/lib/admin-errors";
import { requireDeskAuth } from "@/lib/auth";
import { getAdminSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  await requireDeskAuth();
  const { saved } = await searchParams;
  const { data: settings, error } = await attempt(() => getAdminSettings(), null);

  return (
    <>
      <p className="engraved">Site</p>
      <h1>聯絡設定</h1>
      <p className="mute" style={{ maxWidth: 520, lineHeight: 1.7, marginBottom: 28 }}>
        LINE 與 Instagram 為全站按鈕連結。介紹影片最多三格，首頁排成一列；空的那格不顯示。換成新片改這裡即可。
      </p>
      {saved ? <p className="flash">已儲存（資料庫已確認寫入）。</p> : null}
      {error || !settings ? (
        <p className="flash" role="alert">
          讀不到目前的設定，為避免覆蓋資料，已停用儲存。{adminErrorMessage(error?.code, error?.detail)}
        </p>
      ) : (
        <SettingsForm settings={settings} action={saveContacts} />
      )}
    </>
  );
}
