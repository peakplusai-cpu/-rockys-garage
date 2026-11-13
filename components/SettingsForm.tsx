"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { lineAddFriendHref, isLineContactInputValid } from "@/lib/line";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm({
  settings,
  action,
}: {
  settings: SiteSettings;
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  const [error, setError] = useState("");
  const [lineInput, setLineInput] = useState(settings.lineUrl);
  const [pending, startTransition] = useTransition();

  const lineResolved = useMemo(() => lineAddFriendHref(lineInput, ""), [lineInput]);
  const lineOk = isLineContactInputValid(lineInput);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await action(body);
      if (result?.error) setError(result.error);
    });
  }

  function testLineLink() {
    if (!lineResolved) return;
    window.open(lineResolved, "_blank", "noopener,noreferrer");
  }

  return (
    <form onSubmit={onSubmit}>
      {error ? (
        <p className="flash" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-grid">
        <div className="field wide">
          <label htmlFor="lineUrl">LINE 官方帳號 ID 或加好友網址</label>
          <input
            id="lineUrl"
            name="lineUrl"
            value={lineInput}
            onChange={(event) => setLineInput(event.target.value)}
            placeholder="@123abcde、Premium ID、https://line.me/R/ti/p/…、https://lin.ee/…"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mute" style={{ marginTop: 10, lineHeight: 1.65, maxWidth: 560 }}>
            可到 LINE Official Account Manager →「增加好友」→「建立好友連結／網址」複製連結；也可貼 Basic／Premium
            ID（須為官方帳號的真實 Basic／Premium ID，不是範例 rockysgarage）或官方後台複製的 https
            連結。line.me 網址會自動把路徑裡的 @ 改成 %40（避免 404）；lin.ee 原樣使用。
          </p>
          <p className="mute" style={{ marginTop: 6, lineHeight: 1.65, maxWidth: 560 }}>
            個人 LINE：請填 <code>~你的LINE ID</code>（前面加 ~，需先在 LINE 設定好 ID 並開啟「允許他人透過 ID 加好友」），
            或貼個人「加好友連結」（LINE App →主頁→加好友→QR 碼→分享／複製連結，形如 line.me/ti/p/xxxx，會原樣使用）。
          </p>
          {lineInput.trim() ? (
            <div className="line-preview" style={{ marginTop: 12 }}>
              <span className="engraved" style={{ display: "block", marginBottom: 6 }}>
                解析後連結（前台按鈕實際開啟）
              </span>
              {lineOk && lineResolved ? (
                <>
                  <code style={{ display: "block", wordBreak: "break-all", marginBottom: 10 }}>{lineResolved}</code>
                  <button type="button" className="btn btn-ghost" onClick={testLineLink}>
                    測試開啟連結
                  </button>
                </>
              ) : (
                <span className="flash-bad" role="alert">
                  {UNSAFE_HINT(lineInput)}
                </span>
              )}
            </div>
          ) : null}
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
                placeholder="例如：Porsche 911 入庫實拍"
                autoComplete="off"
              />
            </div>
          );
        })}
      </div>
      <button className="btn" type="submit" disabled={pending || (lineInput.trim() !== "" && !lineOk)}>
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}

function UNSAFE_HINT(input: string) {
  if (/^(javascript|data):/i.test(input.trim())) return "不允許 javascript: 或 data: 網址。";
  return "請輸入 ID 或 http(s) 網址。";
}
