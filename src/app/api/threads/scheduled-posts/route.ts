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

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await ensureThreadsScheduledPostsTable();

  const result = await pool.query(
    `SELECT
       id,
       user_id AS "userId",
       text,
       scheduled_at AS "scheduledAt",
       status,
       posted_at AS "postedAt",
       error_message AS "errorMessage",
       created_at AS "createdAt",
       updated_at AS "updatedAt"
     FROM threads_scheduled_posts
     ORDER BY created_at DESC, id DESC;`
  );

  return NextResponse.json({ posts: result.rows });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = body?.text as string | undefined;
  const scheduledAt = body?.scheduledAt as string | null | undefined;

  if (!text || typeof text !== "string") {
    return NextResponse.json(
      { error: "text は必須です" },
      { status: 400 }
    );
  }

  await ensureThreadsScheduledPostsTable();

  const result = await pool.query(
    `INSERT INTO threads_scheduled_posts (user_id, text, scheduled_at, status)
     VALUES ($1, $2, $3, 'scheduled')
     RETURNING
       id,
       user_id AS "userId",
       text,
       scheduled_at AS "scheduledAt",
       status,
       posted_at AS "postedAt",
       error_message AS "errorMessage",
       created_at AS "createdAt",
       updated_at AS "updatedAt";`,
    [adminUser.id, text, scheduledAt ? new Date(scheduledAt) : null]
  );

  return NextResponse.json({ post: result.rows[0] });
}
