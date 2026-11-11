"use client";

import { useEffect, useState } from "react";
import { HERO_CAROUSEL_MS, HERO_SLIDES } from "@/lib/hero-slides";

export function RockyHeroCarousel() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || HERO_SLIDES.length < 2) return;

    let timer: number | undefined;

    const start = () => {
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        setIndex((i) => (i + 1) % HERO_SLIDES.length);
      }, HERO_CAROUSEL_MS);
    };

    const onVisibility = () => {
      if (document.hidden) window.clearInterval(timer);
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduceMotion]);

  return (
    <div className="rocky-hero-reel" aria-hidden>
      {HERO_SLIDES.map((slide, i) => (
        <div key={slide.id} className={`rocky-hero-slide${i === index ? " on" : ""}`}>
          <img src={slide.src} alt="" decoding="async" />
        </div>
      ))}
    </div>
  );
}
