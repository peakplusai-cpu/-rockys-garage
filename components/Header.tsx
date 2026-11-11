"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE_NAME, SITE_NAME_ZH } from "@/lib/site";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <Link href="/" className="wordmark" onClick={() => setOpen(false)}>
          <span className="wordmark-en">{SITE_NAME}</span>
          <span className="wordmark-zh">{SITE_NAME_ZH}</span>
        </Link>
        <nav className="nav">
          <Link href="/#inventory">庫存</Link>
          <Link href="/#reels">影片</Link>
          <Link href="/admin">員工</Link>
          <Link href="/inquiry" className="nav-cta">
            預約賞車
          </Link>
        </nav>
        <button className="nav-toggle" type="button" onClick={() => setOpen(true)}>
          選單
        </button>
      </header>
      <div className={`mobile-nav${open ? " open" : ""}`}>
        <button className="nav-toggle" type="button" onClick={() => setOpen(false)}>
          關閉
        </button>
        <Link href="/" onClick={() => setOpen(false)}>
          首頁
        </Link>
        <Link href="/#inventory" onClick={() => setOpen(false)}>
          庫存
        </Link>
        <Link href="/#reels" onClick={() => setOpen(false)}>
          影片
        </Link>
        <Link href="/inquiry" onClick={() => setOpen(false)}>
          預約賞車
        </Link>
        <Link href="/admin" onClick={() => setOpen(false)}>
          員工
        </Link>
      </div>
    </>
  );
}
