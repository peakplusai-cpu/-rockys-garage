import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAdmin } from "@/app/actions/auth";
import { adminErrorMessage } from "@/lib/admin-errors";
import { adminExists, envAdminPassword, isAuthenticated } from "@/lib/auth";
import { supabaseEnvReport, supabaseWriteBlocker } from "@/lib/supabase";

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
    { href: "/admin/health", label: "連線檢查" },
  ];
  const blocker = supabaseWriteBlocker();
  const localFile = !blocker && !supabaseEnvReport().urlSet;

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
      <div className="admin-main">
        {blocker ? (
          <div className="admin-alert" role="alert">
            <strong>資料庫未連接，後台儲存的資料不會被保留。</strong> {adminErrorMessage(blocker)}{" "}
            <Link href="/admin/health">查看連線檢查</Link>
          </div>
        ) : localFile ? (
          <div className="admin-alert admin-alert-warn" role="status">
            <strong>未連接 Supabase，目前存在本機檔案。</strong> 部署或重啟後資料會遺失，正式環境請設定 Supabase 環境變數。{" "}
            <Link href="/admin/health">查看連線檢查</Link>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
