"use client";

import { useEffect, useState } from "react";
import { LineLaunch } from "@/components/LineLaunch";
import type { Staff } from "@/lib/types";

const MESSAGE = "您好，我想高價出售愛車，想請您協助估價。";

export function BuybackLauncher({ staff }: { staff: Staff[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-ghost finder-buyback" onClick={() => setOpen(true)}>
        高價收車
      </button>

      {open ? (
        <div className="buyback" role="dialog" aria-modal="true" aria-label="高價收車 選擇業務" onClick={() => setOpen(false)}>
          <div className="buyback-card" onClick={(event) => event.stopPropagation()}>
            <div className="buyback-head">
              <div>
                <p className="engraved">高價收車 · 選擇業務</p>
                <h2>誰為您估價？</h2>
              </div>
              <button type="button" className="buyback-close" onClick={() => setOpen(false)} aria-label="關閉">
                ✕
              </button>
            </div>

            {staff.length ? (
              <ul className="buyback-list">
                {staff.map((person) => (
                  <li key={person.id}>
                    <LineLaunch lineUrl={person.lineUrl} lineId={person.lineId} message={MESSAGE}>
                      <span className="name">{person.displayName}</span>
                      <span className="role">{person.role}</span>
                      <span className="go">LINE ↗</span>
                    </LineLaunch>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-line">尚未設定公開聯絡人。</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
