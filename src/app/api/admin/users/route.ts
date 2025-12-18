import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const USERS_TABLE = "igos_users";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type Role = "admin" | "user";

type UserRow = {
  loginId: string;
  displayName?: string;
  role: Role;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${USERS_TABLE} (
      login_id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS display_name TEXT;`);
  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS role TEXT;`);
  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS active BOOLEAN;`);
  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;`);
  await pool.query(`ALTER TABLE ${USERS_TABLE} ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;`);
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json([]);
  await ensureTable();

  const result = await pool.query(
    `SELECT
      login_id AS "loginId",
      display_name AS "displayName",
      role,
      active,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM ${USERS_TABLE}
    ORDER BY active DESC, role ASC, login_id ASC;`,
  );

  return NextResponse.json(result.rows as UserRow[]);
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }
  await ensureTable();

  const body = (await req.json().catch(() => ({}))) as {
    loginId?: string;
    displayName?: string;
    password?: string;
    role?: Role;
    active?: boolean;
  };

  const loginId = String(body.loginId ?? "").trim();
  const displayName = String(body.displayName ?? "").trim() || null;
  const password = String(body.password ?? "").trim();
  const role: Role = body.role === "admin" ? "admin" : "user";
  const active = body.active !== false;

  if (!loginId || !password) {
    return NextResponse.json({ ok: false, error: "loginId and password are required" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  await pool.query(
    `INSERT INTO ${USERS_TABLE} (login_id, password_hash, display_name, role, active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (login_id) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      active = EXCLUDED.active,
      updated_at = NOW();`,
    [loginId, passwordHash, displayName, role, active],
  );

  return NextResponse.json({ ok: true, loginId });
}

export async function PUT(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }
  await ensureTable();

  const body = (await req.json().catch(() => ({}))) as {
    loginId?: string;
    displayName?: string;
    password?: string;
    role?: Role;
    active?: boolean;
  };

  const loginId = String(body.loginId ?? "").trim();
  if (!loginId) {
    return NextResponse.json({ ok: false, error: "loginId is required" }, { status: 400 });
  }

  const role: Role = body.role === "admin" ? "admin" : "user";
  const active = body.active !== false;
  const password = String(body.password ?? "").trim();
  const displayName = String(body.displayName ?? "").trim() || null;

  if (password) {
    const passwordHash = hashPassword(password);
    await pool.query(
      `UPDATE ${USERS_TABLE} SET
        password_hash = $2,
        display_name = $3,
        role = $4,
        active = $5,
        updated_at = NOW()
      WHERE login_id = $1;`,
      [loginId, passwordHash, displayName, role, active],
    );
  } else {
    await pool.query(
      `UPDATE ${USERS_TABLE} SET
        display_name = $2,
        role = $3,
        active = $4,
        updated_at = NOW()
      WHERE login_id = $1;`,
      [loginId, displayName, role, active],
    );
  }

  return NextResponse.json({ ok: true, loginId });
}

export async function DELETE(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const loginId = String(searchParams.get("loginId") ?? "").trim();
  if (!loginId) {
    return NextResponse.json({ ok: false, error: "loginId is required" }, { status: 400 });
  }

  await pool.query(`DELETE FROM ${USERS_TABLE} WHERE login_id = $1;`, [loginId]);
  return NextResponse.json({ ok: true });
}
