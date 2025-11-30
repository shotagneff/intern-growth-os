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

  // 既存テーブル向けに不足カラムを追加
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;'
  );
  // 既存テーブル向けに不足カラムを追加
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;'
  );
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ user: null });
  }

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, member_id AS "memberId", name, is_admin AS "isAdmin" FROM users WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: result.rows[0] });
}
