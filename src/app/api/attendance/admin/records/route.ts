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
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

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

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, member_id AS "memberId", is_admin AS "isAdmin" FROM users WHERE id = $1 LIMIT 1;`,
    [userId],
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0] as { id: string; memberId: string; isAdmin: boolean };
  if (!user.isAdmin) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
       ar.member_id AS "memberId",
       m.name AS "memberName",
       ar.work_date::date AS "workDate",
       ar.clock_in_at AS "clockInAt",
       ar.clock_out_at AS "clockOutAt",
       ar.total_minutes AS "totalMinutes"
     FROM attendance_records ar
     LEFT JOIN members m ON m.id = ar.member_id
     WHERE ar.work_date::date BETWEEN $1::date AND $2::date
     ORDER BY m.name NULLS LAST, ar.work_date::date ASC;`,
    [startStr, endStr],
  );

  const rows = result.rows as {
    memberId: string;
    memberName: string | null;
    workDate: string;
    clockInAt: string | null;
    clockOutAt: string | null;
    totalMinutes: number | null;
  }[];

  // メンバー単位にグルーピング
  const byMember: Record<
    string,
    {
      memberId: string;
      memberName: string | null;
      records: {
        workDate: string;
        clockInAt: string | null;
        clockOutAt: string | null;
        totalMinutes: number | null;
      }[];
      monthlyTotalMinutes: number;
    }
  > = {};

  for (const r of rows) {
    if (!byMember[r.memberId]) {
      byMember[r.memberId] = {
        memberId: r.memberId,
        memberName: r.memberName,
        records: [],
        monthlyTotalMinutes: 0,
      };
    }
    byMember[r.memberId].records.push({
      workDate: r.workDate,
      clockInAt: r.clockInAt,
      clockOutAt: r.clockOutAt,
      totalMinutes: r.totalMinutes,
    });
    byMember[r.memberId].monthlyTotalMinutes += r.totalMinutes ?? 0;
  }

  const members = Object.values(byMember).sort((a, b) => {
    const an = a.memberName || a.memberId;
    const bn = b.memberName || b.memberId;
    return an.localeCompare(bn, "ja");
  });

  return NextResponse.json({
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    members,
  });
}
