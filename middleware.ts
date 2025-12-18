import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./src/lib/auth-token";

const COOKIE_NAME = "igos_session";

export async function middleware(req: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|api/auth).*)",
  ],
};
