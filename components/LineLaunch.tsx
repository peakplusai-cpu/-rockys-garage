import type { ReactNode } from "react";
import { resolveLineChatHref, resolveLineHref } from "@/lib/line";

export function LineLaunch({
  lineUrl,
  lineId,
  message,
  className,
  children,
}: {
  lineUrl: string;
  lineId: string;
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  const href = message?.trim()
    ? resolveLineChatHref(lineUrl, lineId, message)
    : resolveLineHref(lineUrl, lineId);
  if (!href) return <span className={className}>{children}</span>;

  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
