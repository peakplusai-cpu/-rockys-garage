import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { lineLoginEnabled } from "@/lib/line";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (!lineLoginEnabled()) {
    return NextResponse.redirect(new URL("/admin/staff?error=noline", request.url));
  }
  const url = new URL(request.url);
  const staffId = url.searchParams.get("staff") ?? "";
  const origin = url.origin;
  const redirectUri = process.env.LINE_REDIRECT_URI || `${origin}/api/line/callback`;
  const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.LINE_CHANNEL_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", staffId);
  authorize.searchParams.set("scope", "profile");
  return NextResponse.redirect(authorize);
}
