import { NextResponse } from "next/server";
import { classifyDbError } from "@/lib/admin-errors";
import { isAuthenticated } from "@/lib/auth";
import { sameOriginPath } from "@/lib/guards";
import { consumeLineOauthState } from "@/lib/line-oauth";
import { listAdminStaff, saveStaff } from "@/lib/store";

function staffRedirect(requestUrl: string, query: string) {
  return NextResponse.redirect(sameOriginPath(requestUrl, `/admin/staff?${query}`));
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(sameOriginPath(request.url, "/admin/login"));
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const staffId = await consumeLineOauthState(url.searchParams.get("state") ?? "");
  if (!staffId) return staffRedirect(request.url, "error=state");
  if (!code || !process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET) {
    return staffRedirect(request.url, "error=noline");
  }
  const origin = sameOriginPath(request.url, "/").origin;
  const redirectUri = process.env.LINE_REDIRECT_URI || `${origin}/api/line/callback`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINE_CHANNEL_ID,
    client_secret: process.env.LINE_CHANNEL_SECRET,
  });
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) return staffRedirect(request.url, "error=token");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) return staffRedirect(request.url, "error=token");
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) return staffRedirect(request.url, "error=profile");
  const profile = (await profileRes.json()) as { userId?: string };
  if (!profile.userId || !/^[A-Za-z0-9_-]{8,64}$/.test(profile.userId)) {
    return staffRedirect(request.url, "error=profile");
  }
  try {
    const staff = (await listAdminStaff()).find((person) => person.id === staffId);
    if (!staff) return staffRedirect(request.url, "error=missing");
    await saveStaff({ ...staff, lineUserId: profile.userId });
  } catch (error) {
    console.error("line callback save", classifyDbError(error).code);
    return staffRedirect(request.url, "error=db");
  }
  return staffRedirect(request.url, "bound=1");
}
