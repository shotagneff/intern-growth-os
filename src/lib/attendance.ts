// 出勤スケジュールのDBアクセス（曜日デフォルト + 日別上書き）。サーバー専用。
import { pool } from "@/lib/db";
import { ensureAttendanceTables } from "@/lib/schema";
import type { WeeklyRow, OverrideRow } from "@/lib/attendance-util";

export { todayJst } from "@/lib/attendance-util";

export async function getWeekly(): Promise<WeeklyRow[]> {
  await ensureAttendanceTables();
  const r = await pool.query("SELECT member_id, weekday, start_time FROM attendance_weekly");
  return r.rows.map((x) => ({
    memberId: String(x.member_id),
    weekday: Number(x.weekday),
    startTime: (x.start_time as string) ?? null,
  }));
}

export async function getOverrides(fromDate: string): Promise<OverrideRow[]> {
  await ensureAttendanceTables();
  const r = await pool.query(
    "SELECT member_id, date, start_time, is_off FROM attendance_override WHERE date >= $1",
    [fromDate]
  );
  return r.rows.map((x) => ({
    memberId: String(x.member_id),
    date: String(x.date),
    startTime: (x.start_time as string) ?? null,
    isOff: Boolean(x.is_off),
  }));
}

export async function setWeekly(memberId: string, weekday: number, startTime: string | null): Promise<void> {
  await ensureAttendanceTables();
  await pool.query(
    `INSERT INTO attendance_weekly (member_id, weekday, start_time) VALUES ($1,$2,$3)
     ON CONFLICT (member_id, weekday) DO UPDATE SET start_time = EXCLUDED.start_time`,
    [memberId, weekday, startTime || null]
  );
}

export async function setOverride(
  memberId: string,
  date: string,
  startTime: string | null,
  isOff: boolean
): Promise<void> {
  await ensureAttendanceTables();
  if (!startTime && !isOff) {
    await pool.query("DELETE FROM attendance_override WHERE member_id=$1 AND date=$2", [memberId, date]);
    return;
  }
  await pool.query(
    `INSERT INTO attendance_override (member_id, date, start_time, is_off) VALUES ($1,$2,$3,$4)
     ON CONFLICT (member_id, date) DO UPDATE SET start_time = EXCLUDED.start_time, is_off = EXCLUDED.is_off`,
    [memberId, date, startTime || null, isOff]
  );
}
