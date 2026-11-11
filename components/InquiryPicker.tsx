"use client";

import { useMemo, useState } from "react";
import { LineLaunch } from "@/components/LineLaunch";
import type { Staff } from "@/lib/types";

export function InquiryPicker({ staff, carLabel }: { staff: Staff[]; carLabel: string }) {
  const [selected, setSelected] = useState(staff[0]?.id ?? "");
  const current = useMemo(() => staff.find((s) => s.id === selected), [staff, selected]);
  const message = carLabel
    ? `您好，我想預約鑑賞 ${carLabel}。`
    : "您好，我想預約鑑賞。";

  if (!staff.length) {
    return <p className="empty-line">尚未設定真實業務 LINE，暫時無法線上預約。</p>;
  }

  return (
    <>
      <ul className="pick">
        {staff.map((person) => (
          <li key={person.id}>
            <label>
              <input
                type="radio"
                name="staff"
                value={person.id}
                checked={selected === person.id}
                onChange={() => setSelected(person.id)}
              />
              <span className="who">{person.displayName}</span>
              <span className="mute">{person.role}</span>
              <span className="mute">{person.note}</span>
              <span className="engraved">{person.lineId || "LINE"}</span>
            </label>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 36, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        {current ? (
          <LineLaunch className="btn" lineUrl={current.lineUrl} lineId={current.lineId} message={message}>
            開啟 LINE 聊天室
          </LineLaunch>
        ) : (
          <span className="btn" style={{ opacity: 0.35 }}>
            開啟 LINE 聊天室
          </span>
        )}
        {carLabel ? <span className="mute">將帶入：{carLabel}</span> : null}
      </div>
    </>
  );
}
