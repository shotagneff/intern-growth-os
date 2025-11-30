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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const memberId = body?.memberId as string | undefined;
  const password = body?.password as string | undefined;

  if (!memberId || !password) {
    return NextResponse.json(
      { error: "memberId と password は必須です" },
      { status: 400 }
    );
  }

  const commonPassword = process.env.COMMON_PASSWORD;
  if (!commonPassword) {
    return NextResponse.json(
      { error: "サーバー側の設定に問題があります(COMMON_PASSWORD)" },
      { status: 500 }
    );
  }

  if (password !== commonPassword) {
    return NextResponse.json({ error: "ID またはパスワードが違います" }, { status: 401 });
  }

  await ensureUsersTable();

  // 管理者が存在するかどうかを確認
  const adminCountResult = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM users WHERE is_admin = TRUE;"
  );
  const hasAdmin = Number(adminCountResult.rows[0]?.count ?? "0") > 0;

  let userId: string | null = null;

  if (!hasAdmin) {
    // まだ管理者が一人もいない場合: ログインしてきた member_id を admin として upsert
    const existing = await pool.query(
      `SELECT id FROM users WHERE member_id = $1 LIMIT 1;`,
      [memberId]
    );

    if (existing.rows.length === 0) {
      userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, member_id, is_admin) VALUES ($1, $2, TRUE);`,
        [userId, memberId]
      );
    } else {
      userId = existing.rows[0].id as string;
      await pool.query(
        `UPDATE users SET is_admin = TRUE WHERE id = $1;`,
        [userId]
      );
    }
  } else {
    // 既に管理者が存在する場合: 既存ユーザーのみログイン許可
    const existing = await pool.query(
      `SELECT id FROM users WHERE member_id = $1 LIMIT 1;`,
      [memberId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "このIDではログインできません。管理者に確認してください" },
        { status: 401 }
      );
    }

    userId = existing.rows[0].id as string;
  }

  const res = NextResponse.json({ ok: true });

  const secure = process.env.NODE_ENV === "production";

  res.cookies.set("ig_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30日
  });

  return res;
}
