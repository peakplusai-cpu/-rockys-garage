import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getStore, saveStore } from "@/lib/store";

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const staffId = url.searchParams.get("state") ?? "";
  if (!code || !process.env.LINE_CHANNEL_ID || !process.env.LINE_CHANNEL_SECRET) {
    return NextResponse.redirect(new URL("/admin/staff?error=noline", request.url));
  }
  const origin = url.origin;
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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/admin/staff?error=token", request.url));
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/admin/staff?error=profile", request.url));
  }
  const profile = (await profileRes.json()) as { userId?: string; displayName?: string };
  const store = await getStore();
  const staff = store.staff.find((person) => person.id === staffId);
  if (staff && profile.userId) {
    staff.lineUserId = profile.userId;
    if (!staff.lineId && profile.displayName) {
      staff.note = staff.note || `LINE：${profile.displayName}`;
    }
    await saveStore(store);
  }
  return NextResponse.redirect(new URL("/admin/staff?bound=1", request.url));
}
