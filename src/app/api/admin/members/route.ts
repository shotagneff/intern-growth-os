import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      team TEXT,
      role TEXT,
      icon_url TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS team TEXT;');
  await pool.query('ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT;');
  await pool.query(
    'ALTER TABLE members ADD COLUMN IF NOT EXISTS icon_url TEXT;'
  );
  await pool.query(
    'ALTER TABLE members ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;'
  );
  await pool.query(
    'ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();'
  );
}

export async function GET() {
  await ensureTable();

  const result = await pool.query(
    `SELECT
      id,
      name,
      team,
      role,
      icon_url AS "iconUrl",
      active,
      updated_at AS "updatedAt"
    FROM members
    ORDER BY active DESC, updated_at DESC;`
  );

  return NextResponse.json(result.rows);
}

export async function PUT(req: NextRequest) {
  await ensureTable();

  const body = await req.json();
  const members = (body?.members ?? []) as Array<{
    id: string;
    name: string;
    team?: string;
    role?: string;
    iconUrl?: string;
    active: boolean;
  }>;

  if (!Array.isArray(members)) {
    return NextResponse.json({ error: "members must be an array" }, { status: 400 });
  }

  for (const m of members) {
    if (!m?.id || !m?.name) {
      return NextResponse.json(
        { error: "each member requires id and name" },
        { status: 400 }
      );
    }

    await pool.query(
      `INSERT INTO members (
        id,
        name,
        team,
        role,
        icon_url,
        active,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        team = EXCLUDED.team,
        role = EXCLUDED.role,
        icon_url = EXCLUDED.icon_url,
        active = EXCLUDED.active,
        updated_at = NOW();`,
      [
        m.id,
        m.name,
        m.team ?? null,
        m.role ?? null,
        m.iconUrl ?? null,
        m.active ?? true,
      ]
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await pool.query(`DELETE FROM members WHERE id = $1;`, [id]);
  return NextResponse.json({ ok: true });
}
