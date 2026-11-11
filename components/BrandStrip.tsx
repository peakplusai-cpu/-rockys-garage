import { LOGO_CELL, LOGO_COLS, LOGO_COUNT } from "@/lib/intro-logos";

const SIZE = 56;

export function BrandStrip() {
  const scale = SIZE / LOGO_CELL;
  const items = Array.from({ length: LOGO_COUNT }, (_, i) => i);
  const run = items.map((i) => (
    <span
      key={i}
      className="brand-logo"
      style={{
        backgroundPosition: `-${(i % LOGO_COLS) * SIZE}px -${Math.floor(i / LOGO_COLS) * SIZE}px`,
        backgroundSize: `${LOGO_COLS * LOGO_CELL * scale}px auto`,
      }}
    />
  ));

  return (
    <div className="brand-strip" aria-hidden>
      <div className="brand-track">
        {run}
        {run}
      </div>
    </div>
  );
}
