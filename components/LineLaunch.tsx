"use client";

import type { MouseEvent, ReactNode } from "react";
import { lineTarget } from "@/lib/line";

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function openLine(lineUrl: string, lineId: string, message: string) {
  const target = lineTarget(lineUrl, lineId, message);
  const web = target.chatWeb || target.addFriendWeb;
  const app = target.chatApp || target.addFriendApp;
  if (!web && !app) return;

  if (!isMobile()) {
    if (web) window.open(web, "_blank", "noopener,noreferrer");
    return;
  }

  if (isAndroid() && app.startsWith("line://")) {
    const path = app.replace(/^line:\/\//, "");
    const fallback = encodeURIComponent(web);
    window.location.href = `intent://${path}#Intent;scheme=line;package=jp.naver.line.android;S.browser_fallback_url=${fallback};end`;
    return;
  }

  if (!app) {
    window.location.href = web;
    return;
  }

  const started = Date.now();
  window.location.href = app;
  window.setTimeout(() => {
    if (document.hidden) return;
    if (Date.now() - started < 2500) window.location.href = web;
  }, 900);
}

export function LineLaunch({
  lineUrl,
  lineId,
  message,
  className,
  children,
}: {
  lineUrl: string;
  lineId: string;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  const href = lineTarget(lineUrl, lineId, message).chatWeb;
  if (!href) return <span className={className}>{children}</span>;

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    openLine(lineUrl, lineId, message ?? "");
  }

  return (
    <a href={href} className={className} onClick={onClick} rel="noreferrer">
      {children}
    </a>
  );
}
