import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance_change_requests (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      attendance_record_id TEXT,
      target_date DATE NOT NULL,
      requested_clock_in_at TIMESTAMPTZ,
      requested_clock_out_at TIMESTAMPTZ,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by_member_id TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_attendance_records_member_date ON attendance_records(member_id, work_date);",
  );
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
    `SELECT id, clock_in_at
       FROM attendance_records
      WHERE member_id = $1 AND work_date::date = $2::date
      LIMIT 1;`,
    [user.memberId, workDate],
  );

  if (existing.rows.length > 0 && existing.rows[0].clock_in_at) {
    return NextResponse.json(
      { error: "すでに本日の出勤打刻が登録されています" },
      { status: 400 },
    );
  }

  const id = randomUUID();
  const clockInAt = now.toISOString();

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO attendance_records (id, member_id, work_date, clock_in_at)
       VALUES ($1, $2, $3, $4);`,
      [id, user.memberId, workDate, clockInAt],
    );
  } else {
    await pool.query(
      `UPDATE attendance_records
       SET clock_in_at = $1, updated_at = NOW()
       WHERE id = $2;`,
      [clockInAt, existing.rows[0].id],
    );
  }

  return NextResponse.json({ ok: true, clockInAt });
}
