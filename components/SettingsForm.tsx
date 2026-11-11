"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { SiteSettings } from "@/lib/settings";

export function SettingsForm({
  settings,
  action,
}: {
  settings: SiteSettings;
  action: (formData: FormData) => Promise<{ error: string } | undefined>;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

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
                placeholder="例如：Porsche 911 入庫實拍"
                autoComplete="off"
              />
            </div>
          );
        })}
      </div>
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "儲存中…" : "儲存"}
      </button>
    </form>
  );
}
