"use client";

import type { MouseEvent } from "react";
import { instagramAppUrl, instagramWebUrl } from "@/lib/instagram";

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function openInstagram(username: string) {
  const web = instagramWebUrl(username);
  const app = instagramAppUrl(username);
  if (!isMobile()) {
    window.open(web, "_blank", "noopener,noreferrer");
    return;
  }
  const started = Date.now();
  window.location.href = app;
  window.setTimeout(() => {
    if (document.hidden) return;
    if (Date.now() - started < 2500) window.location.href = web;
  }, 900);
}

/** Renders nothing when no account is configured. */
export function InstagramButton({
  username,
  className = "btn btn-ghost",
}: {
  username: string;
  className?: string;
}) {
  if (!username) return null;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openInstagram(username);
  }

  return (
    <a
      href={instagramWebUrl(username)}
      className={className}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram"
    >
      Instagram <span aria-hidden>↗</span>
    </a>
  );
}
