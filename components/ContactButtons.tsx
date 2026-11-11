import { lineTarget } from "@/lib/line";

export function ContactButtons({
  lineUrl,
  instagramUrl,
  inverted = false,
}: {
  lineUrl: string;
  instagramUrl: string;
  inverted?: boolean;
}) {
  const ghost = inverted ? "btn btn-ig" : "btn btn-ghost btn-ig";
  const lineHref = lineTarget(lineUrl, "").addFriendWeb;
  return (
    <div className="contact-row">
      {lineHref ? (
        <a className="btn btn-line" href={lineHref} target="_blank" rel="noopener noreferrer">
          LINE 諮詢
        </a>
      ) : null}
      {instagramUrl ? (
        <a className={ghost} href={instagramUrl} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      ) : null}
    </div>
  );
}
