import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      member_id TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;'
  );
}

async function ensureMembersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT,
      role TEXT,
      icon_url TEXT,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, is_admin FROM users WHERE id = $1 LIMIT 1;`,
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

  await ensureMembersTable();

  const result = await pool.query(
    `SELECT
       id,
       name,
       team,
       role,
       icon_url AS "iconUrl",
       active,
       created_at AS "createdAt"
     FROM members
     ORDER BY created_at ASC, name ASC;`
  );

  return NextResponse.json({ members: result.rows });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const members = body?.members as
    | { id?: string; name: string; team?: string; role?: string; iconUrl?: string; active?: boolean }[]
    | undefined;

  if (!Array.isArray(members)) {
    return NextResponse.json(
      { error: "members 配列が必要です" },
      { status: 400 }
    );
  }

  await ensureMembersTable();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // いったん全削除してから、送られてきた一覧で置き換えるシンプル戦略
    await client.query("DELETE FROM members;");

    for (const m of members) {
      if (!m.name) continue;
      const id = m.id || crypto.randomUUID();
      await client.query(
        `INSERT INTO members (id, name, team, role, icon_url, active)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE));`,
        [id, m.name, m.team ?? null, m.role ?? null, m.iconUrl ?? null, m.active ?? true]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("failed to save members", e);
    return NextResponse.json(
      { error: "メンバー情報の保存に失敗しました" },
      { status: 500 }
    );
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
