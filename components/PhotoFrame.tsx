/**
 * Car photo with a blurred copy behind it. Desktop crops the main image to fill
 * the frame; on phones CSS switches it to `contain` so the whole photo is visible.
 */
export function PhotoFrame({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <span className={`photo-frame ${className}`.trim()}>
      <img
        className="photo-bg"
        src={src}
        alt=""
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
      <img
        className="photo-main"
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </span>
  );
}
