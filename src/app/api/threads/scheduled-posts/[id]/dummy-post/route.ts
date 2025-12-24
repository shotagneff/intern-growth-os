import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureThreadsScheduledPostsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS threads_scheduled_posts (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      scheduled_at TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'scheduled',
      posted_at TIMESTAMPTZ,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

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

  const result = await pool.query(
    `SELECT id, is_admin FROM users WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0] as { id: string; is_admin: boolean };
  if (!user.is_admin) return null;
  return user;
}

async function postToThreadsDummy(text: string) {
  console.log("[Dummy Threads Post]", text);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = await context.params;
  const id = Number(params.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json(
      { error: "id が不正です" },
      { status: 400 }
    );
  }

  await ensureThreadsScheduledPostsTable();

  const result = await pool.query(
    `SELECT id, text, status FROM threads_scheduled_posts WHERE id = $1 LIMIT 1;`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { error: "対象の予約投稿が見つかりません" },
      { status: 404 }
    );
  }

  const row = result.rows[0] as { id: number; text: string; status: string };

  if (row.status !== "scheduled") {
    return NextResponse.json(
      { error: "scheduled 状態の投稿のみダミー投稿できます" },
      { status: 400 }
    );
  }

  try {
    await postToThreadsDummy(row.text);

    await pool.query(
      `UPDATE threads_scheduled_posts
         SET status = 'posted', posted_at = NOW(), updated_at = NOW()
       WHERE id = $1;`,
      [row.id]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Dummy post failed", e);
    await pool.query(
      `UPDATE threads_scheduled_posts
         SET status = 'failed', error_message = $2, updated_at = NOW()
       WHERE id = $1;`,
      [row.id, String(e)]
    );

    return NextResponse.json(
      { error: "ダミー投稿に失敗しました" },
      { status: 500 }
    );
  }
}
