import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      note TEXT,
      url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function GET() {
  await ensureTable();

  const result = await pool.query(
    `SELECT
      id,
      title,
      category,
      note,
      url,
      created_at AS "createdAt"
    FROM documents
    ORDER BY created_at DESC;`
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureTable();

  const body = await req.json();
  const { id, title, category, note, url, createdAt } = body ?? {};

  if (!id || !title) {
    return NextResponse.json({ error: "id と title は必須です" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO documents (
      id,
      title,
      category,
      note,
      url,
      created_at
    ) VALUES (
      $1, $2, $3, $4, $5, COALESCE($6, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      note = EXCLUDED.note,
      url = EXCLUDED.url,
      created_at = EXCLUDED.created_at;`,
    [id, title, category ?? null, note ?? null, url ?? null, createdAt ?? null]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  await pool.query(`DELETE FROM documents WHERE id = $1;`, [id]);

  return NextResponse.json({ ok: true });
}
