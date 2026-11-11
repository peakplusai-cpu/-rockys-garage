const TICKER = [
  "AMERICAN IRON",
  "ROCKY'S GARAGE",
  "台中精選",
  "PRE-OWNED",
  "實車在庫",
  "LINE 預約",
] as const;

export function RockyMarquee() {
  const items = [...TICKER, ...TICKER];
  return (
    <div className="rocky-marquee" aria-hidden>
      <div className="rocky-marquee-track">
        {items.map((label, index) => (
          <span key={`${label}-${index}`} className="rocky-marquee-item">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
