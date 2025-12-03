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

  const events = result.rows as {
    id: number | null;
    date: string;
    title: string;
    type: string;
    location: string;
    description: string | null;
    applyUrl: string | null;
    time: string | null;
    lineKeyword: string | null;
  }[];

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const saturdayEventTitle = "学生定期集会";
  const saturdayEventDescription = "週に一回集合する定期集会です。\n基本的には参加必須です。";
  const saturdayEventTime = "15:00〜18:00";

  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    if (cursor.getDay() === 6) {
      events.push({
        id: null,
        date: formatDate(cursor),
        title: saturdayEventTitle,
        type: "training",
        location: "osaka",
        description: saturdayEventDescription,
        applyUrl: null,
        time: saturdayEventTime,
        lineKeyword: null,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  events.sort((a, b) => {
    if (a.date === b.date) {
      return (a.id ?? 0) - (b.id ?? 0);
    }
    return a.date < b.date ? -1 : 1;
  });

  return NextResponse.json({ events });
}
