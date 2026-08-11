// Next.js 16 で middleware.ts → proxy.ts に改名された（関数名も middleware → proxy）。
//
// 2026-08-11 まで middleware.ts のままだったため、このファイルは読み込まれておらず
// /admin/* と /api/admin/* が誰でも開ける状態だった。
// ログイン画面も認証APIも正常に動いて見えるため、気づきにくい壊れ方だった。
// 触ったときは「認証なしで /api/admin/* が 401 を返すこと」を必ず確かめる。
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-token";

const COOKIE_NAME = "igos_session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  if (isLoginPage || isAuthApi) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  const secret = String(process.env.IGOS_AUTH_SECRET ?? "").trim();
  if (!secret) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "Auth not configured" }, { status: 500 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const payload = token ? await verifySessionToken(token, secret) : null;

  if (!payload) {
    if (isApi) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((isAdminPage || isAdminApi) && payload.role !== "admin") {
    if (isApi) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // TEMP: ランキングボードを host(admin) のみに制限（一般ユーザーは非表示）。解除時はこのブロックを削除。
  const isRankingsPage = pathname === "/rankings" || pathname.startsWith("/rankings/");
  if (isRankingsPage && payload.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
