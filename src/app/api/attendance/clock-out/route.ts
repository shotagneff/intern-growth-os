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

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureAttendanceTables();

  const now = new Date();
  // ローカルタイム（JST前提）で日付文字列を組み立てる
  const workDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`; // YYYY-MM-DD

  const existing = await pool.query(
    `SELECT id, clock_in_at, clock_out_at
       FROM attendance_records
      WHERE member_id = $1 AND work_date::date = $2::date
      LIMIT 1;`,
    [user.memberId, workDate],
  );

  if (existing.rows.length === 0 || !existing.rows[0].clock_in_at) {
    return NextResponse.json(
      { error: "先に出勤打刻をしてください" },
      { status: 400 },
    );
  }

  if (existing.rows[0].clock_out_at) {
    return NextResponse.json(
      { error: "すでに本日の退勤打刻が登録されています" },
      { status: 400 },
    );
  }

  const clockInAt = new Date(existing.rows[0].clock_in_at as string);
  const clockOutAt = now;
  const diffMs = clockOutAt.getTime() - clockInAt.getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  await pool.query(
    `UPDATE attendance_records
     SET clock_out_at = $1, total_minutes = $2, updated_at = NOW()
     WHERE id = $3;`,
    [clockOutAt.toISOString(), totalMinutes, existing.rows[0].id],
  );

  return NextResponse.json({ ok: true, clockOutAt: clockOutAt.toISOString(), totalMinutes });
}
