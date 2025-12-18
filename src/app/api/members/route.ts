import { NextResponse } from "next/server";
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
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

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
    WHERE active = TRUE
    ORDER BY updated_at DESC;`,
  );

  return NextResponse.json(result.rows);
}
