"use client";

import { useEffect, useState } from "react";

const SLIDES = [
  { src: "/hero/ferrari.jpg", label: "Ferrari", kind: "photo" as const },
  { src: "/hero/mercedes.jpg", label: "Mercedes-Benz", kind: "photo" as const },
  { src: "/hero/anson-wordmark.jpg", label: "Anson Top Car", kind: "logo" as const },
];

export function HeroReel({ onLogo }: { onLogo?: (on: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const current = SLIDES[index];

  useEffect(() => {
    onLogo?.(current.kind === "logo");
  }, [current.kind, onLogo]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || SLIDES.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="hero-reel" aria-hidden>
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-slide${i === index ? " on" : ""}${slide.kind === "logo" ? " logo" : ""}`}
          >
            <img src={slide.src} alt="" />
          </div>
        ))}
      </div>
      <div className="hero-reel-ticks" aria-hidden>
        {SLIDES.map((slide, i) => (
          <button
            key={`${slide.src}-t`}
            type="button"
            data-on={i === index}
            onClick={() => setIndex(i)}
            aria-label={slide.label}
          />
        ))}
      </div>
    </>
  );
}
