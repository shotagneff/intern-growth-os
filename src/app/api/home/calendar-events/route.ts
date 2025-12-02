import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

export async function GET(req: NextRequest) {
  await ensureHomeCalendarTable();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 2, 0); // 来月末まで

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
     WHERE date BETWEEN $1 AND $2
     ORDER BY date ASC, id ASC;`,
    [start, end]
  );

  return NextResponse.json({ events: result.rows });
}
