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

// 開発用の一時的なブートストラップAPI: 現在ログイン中のユーザーを管理者に昇格させる
async function promoteCurrentUser(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) {
    return NextResponse.json(
      { error: "ログインしているユーザーがいません" },
      { status: 401 }
    );
  }

  await ensureUsersTable();

  await pool.query(
    `UPDATE users SET is_admin = TRUE WHERE id = $1;`,
    [userId]
  );

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  return promoteCurrentUser(req);
}

export async function GET(req: NextRequest) {
  return promoteCurrentUser(req);
}
