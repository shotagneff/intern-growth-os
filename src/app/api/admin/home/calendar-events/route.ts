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

  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;'
  );
}

async function ensureHomeCalendarTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_calendar_events (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      apply_url TEXT,
      time TEXT,
      line_keyword TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query('ALTER TABLE home_calendar_events ADD COLUMN IF NOT EXISTS line_keyword TEXT;');
}

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

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

  await ensureHomeCalendarTable();

  const result = await pool.query(
    `SELECT
       id,
       to_char(date, 'YYYY-MM-DD') AS date,
       title,
       type,
       location,
       description,
       apply_url AS "applyUrl",
       time,
       line_keyword AS "lineKeyword"
     FROM home_calendar_events
     ORDER BY date ASC, id ASC;`
  );

  return NextResponse.json({ events: result.rows });
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const events = body?.events as
    | {
        id?: number;
        date: string;
        title: string;
        type: string;
        location: string;
        description?: string | null;
        applyUrl?: string | null;
        time?: string | null;
        lineKeyword?: string | null;
      }[]
    | undefined;

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: "events 配列が必要です" }, { status: 400 });
  }

  await ensureHomeCalendarTable();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM home_calendar_events;");

    for (const ev of events) {
      if (!ev.date || !ev.title || !ev.type || !ev.location) continue;
      await client.query(
        `INSERT INTO home_calendar_events (date, title, type, location, description, apply_url, time, line_keyword)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          ev.date,
          ev.title,
          ev.type,
          ev.location,
          ev.description ?? null,
          ev.applyUrl ?? null,
          ev.time ?? null,
          ev.lineKeyword ?? null,
        ]
      );
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("failed to save home_calendar_events", e);
    return NextResponse.json({ error: "カレンダーイベントの保存に失敗しました" }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true });
}
