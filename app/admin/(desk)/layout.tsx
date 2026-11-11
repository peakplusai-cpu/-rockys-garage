import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/actions/auth";
import { adminExists, envAdminPassword, isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthenticated();
  if (!authed) {
    if (!envAdminPassword() && !(await adminExists())) redirect("/admin/setup");
    redirect("/admin/login");
  }
  if (!(await adminExists())) redirect("/admin/setup");

  const headerList = await headers();
  const path = headerList.get("x-invoke-path") || headerList.get("next-url") || "";

  const links = [
    { href: "/admin", label: "總覽" },
    { href: "/admin/cars", label: "庫存" },
    { href: "/admin/staff", label: "顧問 LINE" },
    { href: "/admin/settings", label: "聯絡設定" },
  ];

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/" className="wordmark">
          <span className="wordmark-en">Rocky&apos;s</span>
          <span className="wordmark-zh">員工後台</span>
        </Link>
        <nav>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              data-active={path === link.href || (link.href !== "/admin" && path.startsWith(link.href))}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAdmin}>
          <button className="btn btn-ghost" type="submit">
            登出
          </button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
