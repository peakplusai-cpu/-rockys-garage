import { canonicalInstagramUrl } from "@/lib/instagram";
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
  const instagramHref = canonicalInstagramUrl(instagramUrl);
  return (
    <div className="contact-row">
      {lineHref ? (
        <a className="btn btn-line" href={lineHref} target="_blank" rel="noopener noreferrer">
          LINE 諮詢
        </a>
      ) : null}
      {instagramHref ? (
        <a className={ghost} href={instagramHref} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      ) : null}
    </div>
  );
}
