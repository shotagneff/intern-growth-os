import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTables() {
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_learning_progress (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watched_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, video_id)
    );
  `);
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const result = await pool.query(
    `SELECT video_id FROM e_learning_progress WHERE user_id = $1;`,
    [userId]
  );

  const watchedVideoIds = result.rows.map((r) => r.video_id as string);

  return NextResponse.json({ watchedVideoIds });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const videoId = body?.videoId as string | undefined;

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId は必須です" },
      { status: 400 }
    );
  }

  await ensureTables();

  await pool.query(
    `INSERT INTO e_learning_progress (user_id, video_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, video_id) DO UPDATE SET watched_at = NOW();`,
    [userId, videoId]
  );

  return NextResponse.json({ ok: true });
}
