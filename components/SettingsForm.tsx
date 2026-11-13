"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { lineAddFriendHref } from "@/lib/line";
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

  const linePreview = useMemo(() => lineAddFriendHref(lineInput, ""), [lineInput]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      const result = await action(body);
      if (result?.error) setError(result.error);
    });
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
            可到 LINE Official Account Manager →「增加好友」→「建立好友連結／網址」複製官方加好友連結；也可直接貼
            Basic ID（可含 @）、Premium ID、完整 line.me 網址或 lin.ee 短網址。儲存時會保留你輸入的原文，前台按鈕會自動轉成正確連結。
          </p>
          {lineInput.trim() ? (
            <p className="line-preview" style={{ marginTop: 12 }}>
              <span className="engraved" style={{ display: "block", marginBottom: 6 }}>
                加好友連結預覽
              </span>
              {linePreview ? (
                <a href={linePreview} target="_blank" rel="noopener noreferrer" className="link-line">
                  {linePreview}
                </a>
              ) : (
                <span className="flash-bad" role="alert">
                  無法辨識此格式，請檢查 ID 或網址。
                </span>
              )}
            </p>
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
      <button className="btn" type="submit" disabled={pending || (lineInput.trim() !== "" && !linePreview)}>
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
