"use client";

import { ContactButtons } from "@/components/ContactButtons";
import { RockyHeroCarousel } from "@/components/RockyHeroCarousel";
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
      <RockyHeroCarousel />
      <div className="rocky-hero-shade" aria-hidden />
      <div className="rocky-hero-grid" aria-hidden />
      <div className="rocky-hero-frame">
        <h1 className="rocky-display">
          <span className="rocky-display-en">{SITE_NAME}</span>
          <span className="rocky-display-zh">{SITE_NAME_ZH}</span>
        </h1>
        <div className="hero-actions">
          <a className="btn btn-amber" href="#inventory">
            進入庫存
          </a>
          <ContactButtons lineUrl={lineUrl} instagramUrl={instagramUrl} inverted />
        </div>
      </div>
      <p className="rocky-hero-credit">
        Hero photos:{" "}
        <a href="https://commons.wikimedia.org/wiki/File:Toyota_GR86.jpg" rel="license noopener noreferrer" target="_blank">
          MrWalkr
        </a>
        ,{" "}
        <a
          href="https://commons.wikimedia.org/wiki/File:Porsche_718_Cayman_S_1X7A1629.jpg"
          rel="license noopener noreferrer"
          target="_blank"
        >
          Alexander-93
        </a>{" "}
        /{" "}
        <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license noopener noreferrer" target="_blank">
          CC BY-SA 4.0
        </a>
      </p>
    </section>
  );
}
