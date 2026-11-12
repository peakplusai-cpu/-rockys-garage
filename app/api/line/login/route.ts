import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { sameOriginPath } from "@/lib/guards";
import { issueLineOauthState } from "@/lib/line-oauth";
import { lineLoginEnabled } from "@/lib/line";
import { listAdminStaff } from "@/lib/store";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/login"));
  }
  if (!lineLoginEnabled()) {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/staff?error=noline"));
  }
  const url = new URL(request.url);
  const staffId = url.searchParams.get("staff") ?? "";
  let staffExists = false;
  try {
    staffExists = (await listAdminStaff()).some((person) => person.id === staffId);
  } catch {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/staff?error=db"));
  }
  if (!staffExists) {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/staff?error=missing"));
  }
  const state = await issueLineOauthState(staffId);
  if (!state) {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/staff?error=state"));
  }
  const origin = sameOriginPath(request.url, "/").origin;
  const redirectUri = process.env.LINE_REDIRECT_URI || `${origin}/api/line/callback`;
  const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", process.env.LINE_CHANNEL_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", "profile");
  return NextResponse.redirect(authorize);
}
