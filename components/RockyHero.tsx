"use client";

import { ContactButtons } from "@/components/ContactButtons";
import { SITE_NAME, SITE_NAME_ZH } from "@/lib/site";

export function RockyHero({
  lineUrl,
  instagramUrl,
}: {
  lineUrl: string;
  instagramUrl: string;
}) {
  return (
    <section className="rocky-hero" aria-label="Rocky's Garage">
      <div className="rocky-hero-grid" aria-hidden />
      <div className="rocky-hero-frame">
        <p className="engraved">Taichung · Since MMXXIV</p>
        <h1 className="rocky-display">
          <span className="rocky-display-en">{SITE_NAME}</span>
          <span className="rocky-display-zh">{SITE_NAME_ZH}</span>
        </h1>
        <p className="rocky-lead">
          黑底白線、橘光招牌。庫存在店、價格標清楚，挑車從 LINE 或 IG 一則訊息開始。
        </p>
        <div className="hero-actions">
          <a className="btn btn-amber" href="#inventory">
            進入庫存
          </a>
          <ContactButtons lineUrl={lineUrl} instagramUrl={instagramUrl} inverted />
        </div>
        <ul className="rocky-tags">
          <li>實車賞</li>
          <li>透明標價</li>
          <li>LINE 隨時問</li>
        </ul>
      </div>
    </section>
  );
}
