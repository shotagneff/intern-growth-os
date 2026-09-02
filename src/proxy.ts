// Next.js 16 で middleware.ts → proxy.ts に改名された（関数名も middleware → proxy）。
//
// 2026-08-11 まで middleware.ts のままだったため、このファイルは読み込まれておらず
// /admin/* と /api/admin/* が誰でも開ける状態だった。
// ログイン画面も認証APIも正常に動いて見えるため、気づきにくい壊れ方だった。
// 触ったときは「認証なしで /api/admin/* が 401 を返すこと」を必ず確かめる。
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-token";
import { canViewRestricted, isRestrictedPath } from "@/lib/roles";

const COOKIE_NAME = "igos_session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isLoginPage = pathname === "/login";
  const isAuthApi = pathname.startsWith("/api/auth");
  if (isLoginPage || isAuthApi) return NextResponse.next();

  // ナーチャリングの公開エンドポイント（受信者はログインしていない）。
  // 配信停止・開封/クリック計測・Resend Webhook は認証を通さない。
  const isPublicNurturing =
    pathname.startsWith("/api/nurturing/unsubscribe") ||
    pathname.startsWith("/api/nurturing/track") ||
    pathname.startsWith("/api/nurturing/webhook") ||
    pathname.startsWith("/api/nurturing/cron");
  if (isPublicNurturing) return NextResponse.next();

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

  // 権限を持つ人だけの画面（反響リード / ナーチャリング / 成績 / 売上・KPI）。
  //
  // ページは **リダイレクトせず /forbidden を描画する**（rewrite）。
  // ログイン画面へ飛ばすと、ログイン済みなのに弾かれた理由が伝わらず
  // 「壊れている」と受け取られる。URL は元のまま、中身だけ差し替える。
  if (isRestrictedPath(pathname) && !canViewRestricted(payload.role)) {
    if (isApi) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
