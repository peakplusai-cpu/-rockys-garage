"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PhotoFrame } from "@/components/PhotoFrame";
import type { Photo } from "@/lib/types";

export const CAR_PHOTO_JUMP = "car-photo-jump";

function useSnapTrack(count: number, initial = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initial);
  const frame = useRef(0);

  const goTo = useCallback(
    (next: number, smooth = true) => {
      const node = ref.current;
      if (!node || !count) return;
      const clamped = Math.max(0, Math.min(count - 1, next));
      node.scrollTo({ left: clamped * node.clientWidth, behavior: smooth ? "smooth" : "auto" });
      setIndex(clamped);
    },
    [count]
  );

  const onScroll = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node || !node.clientWidth) return;
      setIndex(Math.round(node.scrollLeft / node.clientWidth));
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { ref, index, setIndex, goTo, onScroll };
}

function Counter({ index, count }: { index: number; count: number }) {
  if (count < 2) return null;
  return (
    <span className="cg-counter" aria-live="polite">
      {index + 1} / {count}
    </span>
  );
}

function Arrows({ index, count, goTo }: { index: number; count: number; goTo: (i: number) => void }) {
  if (count < 2) return null;
  return (
    <>
      <button
        type="button"
        className="cg-arrow cg-prev"
        aria-label="上一張照片"
        disabled={index <= 0}
        onClick={(event) => {
          event.stopPropagation();
          goTo(index - 1);
        }}
      >
        ‹
      </button>
      <button
        type="button"
        className="cg-arrow cg-next"
        aria-label="下一張照片"
        disabled={index >= count - 1}
        onClick={(event) => {
          event.stopPropagation();
          goTo(index + 1);
        }}
      >
        ›
      </button>
    </>
  );
}

function Lightbox({
  photos,
  start,
  label,
  onClose,
}: {
  photos: Photo[];
  start: number;
  label: string;
  onClose: (index: number) => void;
}) {
  const { ref, index, goTo, onScroll } = useSnapTrack(photos.length, start);

  useEffect(() => {
    goTo(start, false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [goTo, start]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose(index);
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, onClose]);

  return (
    <div className="cg-lightbox" role="dialog" aria-modal="true" aria-label={`${label} 照片`}>
      <div className="cg-track cg-track-full" ref={ref} onScroll={onScroll}>
        {photos.map((photo, i) => (
          <div className="cg-slide cg-slide-full" key={photo.id}>
            <img
              src={photo.url}
              alt={photo.alt || `${label} ${i + 1}`}
              loading={Math.abs(i - start) < 2 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
          </div>
        ))}
      </div>
      <button type="button" className="cg-close" aria-label="關閉" onClick={() => onClose(index)}>
        ×
      </button>
      <Counter index={index} count={photos.length} />
      <Arrows index={index} count={photos.length} goTo={goTo} />
    </div>
  );
}

export function CarGallery({
  photos,
  label,
  children,
}: {
  photos: Photo[];
  label: string;
  children?: ReactNode;
}) {
  const count = photos.length;
  const { ref, index, goTo, onScroll } = useSnapTrack(count);
  const thumbs = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    function onJump(event: Event) {
      const target = Number((event as CustomEvent<number>).detail);
      if (Number.isFinite(target)) goTo(target, false);
    }
    window.addEventListener(CAR_PHOTO_JUMP, onJump);
    return () => window.removeEventListener(CAR_PHOTO_JUMP, onJump);
  }, [goTo]);

  useEffect(() => {
    const strip = thumbs.current;
    const active = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !active) return;
    const left = active.offsetLeft - (strip.clientWidth - active.clientWidth) / 2;
    strip.scrollTo({ left, behavior: "smooth" });
  }, [index]);

  const closeLightbox = useCallback(
    (at: number) => {
      setLightbox(null);
      goTo(at, false);
    },
    [goTo]
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowLeft") goTo(index - 1);
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "Enter" && count) setLightbox(index);
  }

  return (
    <>
      <section className="detail-hero" aria-label={`${label} 照片`}>
        <div className="cg-stage" tabIndex={0} onKeyDown={onKeyDown}>
          <div className="cg-track" ref={ref} onScroll={onScroll}>
            {photos.map((photo, i) => (
              <div
                className="cg-slide"
                key={photo.id}
                onClick={() => setLightbox(i)}
                role="button"
                aria-label={`放大第 ${i + 1} 張照片`}
              >
                <PhotoFrame src={photo.url} alt={photo.alt || `${label} ${i + 1}`} eager={i === 0} />
              </div>
            ))}
          </div>
          <Counter index={index} count={count} />
          <Arrows index={index} count={count} goTo={goTo} />
        </div>
        {children}
      </section>

      {count > 1 ? (
        <div className="cg-thumbs" ref={thumbs} aria-label="照片縮圖">
          {photos.map((photo, i) => (
            <button
              type="button"
              key={photo.id}
              className="cg-thumb"
              data-on={i === index}
              aria-label={`第 ${i + 1} 張`}
              aria-current={i === index}
              onClick={() => goTo(i)}
            >
              <img src={photo.url} alt="" loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox !== null ? (
        <Lightbox photos={photos} start={lightbox} label={label} onClose={closeLightbox} />
      ) : null}
    </>
  );
}

export function GalleryGrid({ photos, label, offset = 1 }: { photos: Photo[]; label: string; offset?: number }) {
  function open(i: number) {
    window.dispatchEvent(new CustomEvent(CAR_PHOTO_JUMP, { detail: i + offset }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="gallery-grid">
      {photos.map((photo, i) => (
        <button
          type="button"
          key={photo.id}
          className="gallery-tile"
          aria-label={`在上方查看第 ${i + offset + 1} 張照片`}
          onClick={() => open(i)}
        >
          <PhotoFrame src={photo.url} alt={photo.alt || `${label} ${i + offset + 1}`} className="gallery-item" />
        </button>
      ))}
    </div>
  );
}
