import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth-token";

const COOKIE_NAME = "igos_session";

export async function GET(req: NextRequest) {
  const secret = String(process.env.IGOS_AUTH_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Auth not configured" }, { status: 500 });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const payload = token ? await verifySessionToken(token, secret) : null;
  if (!payload) {
    return NextResponse.json({ ok: false, role: null }, { status: 401 });
  }

  return NextResponse.json({ ok: true, role: payload.role, loginId: payload.loginId ?? null });
}
