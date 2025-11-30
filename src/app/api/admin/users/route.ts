import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      member_id TEXT UNIQUE NOT NULL,
      name TEXT,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, member_id, name, is_admin FROM users WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0] as { id: string; is_admin: boolean };
  if (!user.is_admin) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await pool.query(
    `SELECT id, member_id AS "memberId", name, is_admin AS "isAdmin", created_at AS "createdAt"
     FROM users
     ORDER BY created_at ASC;`
  );

  return NextResponse.json({ users: result.rows });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const memberId = body?.memberId as string | undefined;
  const name = body?.name as string | undefined;
  const isAdmin = Boolean(body?.isAdmin);

  if (!memberId) {
    return NextResponse.json(
      { error: "memberId は必須です" },
      { status: 400 }
    );
  }

  await ensureUsersTable();

  const id = randomUUID();

  await pool.query(
    `INSERT INTO users (id, member_id, name, is_admin)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (member_id) DO UPDATE SET
       name = EXCLUDED.name,
       is_admin = EXCLUDED.is_admin;`,
    [id, memberId, name ?? null, isAdmin]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  await ensureUsersTable();

  await pool.query(`DELETE FROM users WHERE id = $1;`, [id]);

  return NextResponse.json({ ok: true });
}
