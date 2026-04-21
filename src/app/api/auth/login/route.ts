import { NextRequest, NextResponse } from "next/server";
import { signSessionToken } from "@/lib/auth-token";
import { pool } from "@/lib/db";
import { ensureUsersTable } from "@/lib/schema";
import { verifyPassword, hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const COOKIE_NAME = "igos_session";

const USERS_TABLE = "igos_users";

type Role = "admin" | "user";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    password?: string;
  };

  const id = String(body.id ?? "").trim();
  const password = String(body.password ?? "").trim();

  const adminId = String(process.env.IGOS_ADMIN_ID ?? "").trim();
  const adminPassword = String(process.env.IGOS_ADMIN_PASSWORD ?? "").trim();
  const secret = String(process.env.IGOS_AUTH_SECRET ?? "").trim();

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Server auth env is not configured" },
      { status: 500 },
    );
  }

  let role: Role | null = null;
  let loginIdForToken: string | undefined;

  // 1) DB users
  if (process.env.DATABASE_URL) {
    await ensureUsersTable();
    const result = await pool.query(
      `SELECT
        login_id AS "loginId",
        password_hash AS "passwordHash",
        role,
        active
      FROM ${USERS_TABLE}
      WHERE login_id = $1
      LIMIT 1;`,
      [id],
    );

    const row = result.rows?.[0] as
      | { loginId: string; passwordHash: string; role: string; active: boolean }
      | undefined;

    if (row && row.active) {
      const ok = verifyPassword(password, row.passwordHash);
      if (ok) {
        role = row.role === "admin" ? "admin" : "user";
        loginIdForToken = row.loginId;
      }
    }
  }

  // 2) env admin fallback
  if (!role && adminId && adminPassword && id === adminId && password === adminPassword) {
    role = "admin";
    loginIdForToken = adminId;

    // seed admin into DB (optional) so it can be managed later
    if (process.env.DATABASE_URL) {
      await ensureUsersTable();
      await pool.query(
        `INSERT INTO ${USERS_TABLE} (login_id, password_hash, role, active, created_at, updated_at)
         VALUES ($1,$2,'admin',TRUE,NOW(),NOW())
         ON CONFLICT (login_id) DO UPDATE SET
          role = 'admin',
          active = TRUE,
          updated_at = NOW();`,
        [adminId, hashPassword(adminPassword)],
      );
    }
  }

  if (!role) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const token = await signSessionToken({ role, loginId: loginIdForToken, exp }, secret);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });

  return res;
}
