// 社員の名簿。出勤スケジュールとホームの「今日の出勤 / 今日のアポ」が使う。
//
// 2026-09-02 に members テーブルを廃止し、igos_users へ統合した。
// パスと返す形は変えていないので、呼び出し側（/attendance・ホーム）は無変更。
//
// 返す `role` は **職種**（長期インターン等 = job_title）であって、
// 権限（admin / lead_access / user）ではない。名簿としての表示に使う。

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureUsersTable } from "@/lib/schema";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT
      login_id AS id,
      COALESCE(NULLIF(display_name, ''), login_id) AS name,
      team,
      job_title AS role,
      icon_url AS "iconUrl",
      active,
      updated_at AS "updatedAt"
    FROM igos_users
    WHERE active = TRUE
    ORDER BY display_name NULLS LAST, login_id;`,
  );

  return NextResponse.json(result.rows);
}
