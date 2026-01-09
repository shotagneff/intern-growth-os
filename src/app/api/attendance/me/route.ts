import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureAttendanceTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      work_date DATE NOT NULL,
      clock_in_at TIMESTAMPTZ,
      clock_out_at TIMESTAMPTZ,
      total_minutes INTEGER,
      approved_by_member_id TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

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

async function getCurrentUser(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, member_id AS "memberId", is_admin AS "isAdmin" FROM users WHERE id = $1 LIMIT 1;`,
    [userId],
  );

  if (result.rows.length === 0) return null;
  return result.rows[0] as { id: string; memberId: string; isAdmin: boolean };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureAttendanceTables();

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // YYYY-MM

  const baseDate = monthParam ? new Date(monthParam + "-01T00:00:00") : new Date();
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const startStr = monthStart.toISOString().slice(0, 10);
  const endStr = monthEnd.toISOString().slice(0, 10);

  const result = await pool.query(
    `SELECT
       work_date::date AS "workDate",
       clock_in_at AS "clockInAt",
       clock_out_at AS "clockOutAt",
       total_minutes AS "totalMinutes"
     FROM attendance_records
     WHERE member_id = $1
       AND work_date::date BETWEEN $2::date AND $3::date
     ORDER BY work_date::date ASC;`,
    [user.memberId, startStr, endStr],
  );

  const records = result.rows as {
    workDate: string;
    clockInAt: string | null;
    clockOutAt: string | null;
    totalMinutes: number | null;
  }[];

  const monthlyTotalMinutes = records.reduce(
    (sum, r) => sum + (r.totalMinutes ?? 0),
    0,
  );

  return NextResponse.json({
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    records,
    monthlyTotalMinutes,
  });
}
