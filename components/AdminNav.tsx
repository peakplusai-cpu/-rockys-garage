"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/cars", label: "庫存" },
  { href: "/admin/staff", label: "顧問 LINE" },
  { href: "/admin/settings", label: "聯絡設定" },
  { href: "/admin/health", label: "連線檢查" },
];

export function AdminNav() {
  const path = usePathname() || "";
  return (
    <nav>
      {LINKS.map((link) => {
        const active = path === link.href || (link.href !== "/admin" && path.startsWith(link.href));
        return (
          <Link key={link.href} href={link.href} data-active={active ? "true" : "false"}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
