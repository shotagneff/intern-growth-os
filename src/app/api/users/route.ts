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
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function GET(_req: NextRequest) {
  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, member_id AS "memberId", name
     FROM users
     WHERE is_admin = FALSE
     ORDER BY created_at ASC;`
  );

  return NextResponse.json({ users: result.rows });
}
