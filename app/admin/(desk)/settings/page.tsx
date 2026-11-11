import { saveContacts } from "@/app/actions/settings";
import { requireDeskAuth } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireDeskAuth();
  const { saved, error } = await searchParams;
  let settings: Awaited<ReturnType<typeof getSettings>> | null = null;
  try {
    settings = await getSettings();
  } catch {
    settings = null;
  }
  if (!settings) {
    return (
      <>
        <p className="engraved">Site</p>
        <h1>聯絡設定</h1>
        <p className="flash">暫時讀不到目前的設定。請再整理一次，先不要儲存，以免把首頁影片清掉。</p>
      </>
    );
  }

  return (
    <>
      <p className="engraved">Site</p>
      <h1>聯絡設定</h1>
      <p className="mute" style={{ maxWidth: 520, lineHeight: 1.7, marginBottom: 28 }}>
        LINE 與 Instagram 為全站按鈕連結。介紹影片最多三格，首頁排成一列；空的那格不顯示。換成新片改這裡即可。
      </p>
      {saved ? <p className="flash">已儲存。</p> : null}
      {error === "line" ? <p className="flash">LINE 網址格式不正確。</p> : null}
      {error === "instagram" ? <p className="flash">Instagram 網址格式不正確。</p> : null}
      {error === "video" ? <p className="flash">請貼 Instagram 貼文／Reels 或抖音影片連結。</p> : null}
      {error === "save" ? <p className="flash">儲存失敗，請稍後再試。</p> : null}

      <form action={saveContacts}>
        <div className="form-grid">
          <div className="field wide">
            <label htmlFor="lineUrl">LINE 網址或 ID</label>
            <input
              id="lineUrl"
              name="lineUrl"
              defaultValue={settings.lineUrl}
              placeholder="https://line.me/R/ti/p/@帳號"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="field wide">
            <label htmlFor="instagramUrl">Instagram 網址或帳號</label>
            <input
              id="instagramUrl"
              name="instagramUrl"
              defaultValue={settings.instagramUrl}
              placeholder="https://instagram.com/帳號"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {[1, 2, 3].map((index) => {
            const suffix = index === 1 ? "" : String(index);
            const slot = settings.featuredVideos[index - 1] ?? { url: "", caption: "" };
            return (
              <div className="field wide" key={index}>
                <label htmlFor={`featuredVideoUrl${suffix}`}>介紹影片 {index}（Instagram 或抖音）</label>
                <input
                  id={`featuredVideoUrl${suffix}`}
                  name={`featuredVideoUrl${suffix}`}
                  defaultValue={slot.url}
                  placeholder="https://www.instagram.com/reel/…… 或 https://www.tiktok.com/@帳號/video/……"
                  autoComplete="off"
                  spellCheck={false}
                />
                <label htmlFor={`featuredVideoCaption${suffix}`} style={{ marginTop: 12 }}>
                  影片 {index} 說明（選填）
                </label>
                <input
                  id={`featuredVideoCaption${suffix}`}
                  name={`featuredVideoCaption${suffix}`}
                  defaultValue={slot.caption}
                  placeholder="例如：賓士休旅最帥的絕對是他"
                  autoComplete="off"
                />
              </div>
            );
          })}
        </div>
        <button className="btn" type="submit">
          儲存
        </button>
      </form>
    </>
  );
}
