import Link from "next/link";
import { ContactButtons } from "@/components/ContactButtons";
import { LineLaunch } from "@/components/LineLaunch";
import type { SiteSettings } from "@/lib/settings";
import { SITE_LOCALITY, SITE_NAME, SITE_NAME_ZH, SITE_STREET } from "@/lib/site";
import type { Staff } from "@/lib/types";

export function Footer({ staff, settings }: { staff: Staff[]; settings: SiteSettings }) {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <div className="wordmark footer-wordmark">
            <span className="wordmark-en">{SITE_NAME}</span>
            <span className="wordmark-zh">{SITE_NAME_ZH}</span>
          </div>
          <p className="footer-note">
            {SITE_LOCALITY}
            {SITE_STREET}。美式精選中古車，實車在庫、價格透明。賞車與估價請用 LINE 或 Instagram。
          </p>
          <ContactButtons lineUrl={settings.lineUrl} instagramUrl={settings.instagramUrl} />
        </div>
        <div>
          <p className="engraved">顧問團隊</p>
          {staff.length ? (
            <ul className="staff-list">
              {staff.map((person) => (
                <li key={person.id}>
                  <LineLaunch lineUrl={person.lineUrl || settings.lineUrl} lineId={person.lineId}>
                    <span className="name">{person.displayName}</span>
                    <span className="role">{person.role}</span>
                    <span className="go">LINE</span>
                  </LineLaunch>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-line">可使用上方 LINE / Instagram 與我們聯繫。</p>
          )}
        </div>
      </div>
      <div className="colophon">
        <span>Rocky&apos;s Garage · 台中</span>
        <Link href="/admin">員工入口</Link>
      </div>
    </footer>
  );
}
