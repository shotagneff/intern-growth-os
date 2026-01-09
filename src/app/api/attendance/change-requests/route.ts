import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

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

async function requireAdmin(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user || !user.isAdmin) return null;
  return user;
}

// ユーザーからの打刻修正申請を受け付ける
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureAttendanceTables();

  const body = await req.json().catch(() => null);

  // 管理者からの approve/reject アクション
  const action = body?.action as "approve" | "reject" | undefined;
  const requestId = body?.requestId as string | undefined;

  if (action && requestId) {
    const adminUser = await requireAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // 対象申請を取得
    const result = await pool.query(
      `SELECT * FROM attendance_change_requests WHERE id = $1 LIMIT 1;`,
      [requestId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const reqRow = result.rows[0] as {
      id: string;
      member_id: string;
      attendance_record_id: string | null;
      target_date: string;
      requested_clock_in_at: string | null;
      requested_clock_out_at: string | null;
      status: string;
    };

    if (reqRow.status !== "pending") {
      return NextResponse.json(
        { error: "すでに処理済みの申請です" },
        { status: 400 },
      );
    }

    if (action === "reject") {
      await pool.query(
        `UPDATE attendance_change_requests
         SET status = 'rejected', reviewed_by_member_id = $1, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $2;`,
        [adminUser.memberId, requestId],
      );
      return NextResponse.json({ ok: true });
    }

    // approve の場合: attendance_records を作成/更新
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const targetDate = reqRow.target_date;

      const existing = await client.query(
        `SELECT id, clock_in_at, clock_out_at, total_minutes
           FROM attendance_records
          WHERE member_id = $1 AND work_date::date = $2::date
          LIMIT 1;`,
        [reqRow.member_id, targetDate],
      );

      let recordId = existing.rows[0]?.id as string | undefined;
      const clockInAt = reqRow.requested_clock_in_at ?? existing.rows[0]?.clock_in_at ?? null;
      const clockOutAt = reqRow.requested_clock_out_at ?? existing.rows[0]?.clock_out_at ?? null;

      let totalMinutes: number | null = null;
      if (clockInAt && clockOutAt) {
        const ci = new Date(clockInAt);
        const co = new Date(clockOutAt);
        const diffMs = co.getTime() - ci.getTime();
        totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
      }

      if (!recordId) {
        recordId = randomUUID();
        await client.query(
          `INSERT INTO attendance_records (
             id, member_id, work_date, clock_in_at, clock_out_at, total_minutes, approved_by_member_id, approved_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
          [
            recordId,
            reqRow.member_id,
            targetDate,
            clockInAt,
            clockOutAt,
            totalMinutes,
            adminUser.memberId,
          ],
        );
      } else {
        await client.query(
          `UPDATE attendance_records
             SET clock_in_at = $1,
                 clock_out_at = $2,
                 total_minutes = $3,
                 approved_by_member_id = $4,
                 approved_at = NOW(),
                 updated_at = NOW()
           WHERE id = $5;`,
          [clockInAt, clockOutAt, totalMinutes, adminUser.memberId, recordId],
        );
      }

      await client.query(
        `UPDATE attendance_change_requests
           SET status = 'approved',
               attendance_record_id = $1,
               reviewed_by_member_id = $2,
               reviewed_at = NOW(),
               updated_at = NOW()
         WHERE id = $3;`,
        [recordId, adminUser.memberId, requestId],
      );

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      console.error("failed to approve change request", e);
      return NextResponse.json(
        { error: "承認処理に失敗しました" },
        { status: 500 },
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  }

  // 通常のユーザーからの新規申請
  const targetDate = body?.targetDate as string | undefined; // YYYY-MM-DD
  const requestedClockInAt = body?.requestedClockInAt as string | undefined; // ISO or undefined
  const requestedClockOutAt = body?.requestedClockOutAt as string | undefined; // ISO or undefined
  const reason = body?.reason as string | undefined;

  if (!targetDate) {
    return NextResponse.json(
      { error: "targetDate は必須です" },
      { status: 400 },
    );
  }

  if (!requestedClockInAt && !requestedClockOutAt) {
    return NextResponse.json(
      { error: "出勤時刻か退勤時刻のいずれかは必須です" },
      { status: 400 },
    );
  }

  const id = randomUUID();

  await pool.query(
    `INSERT INTO attendance_change_requests (
       id,
       member_id,
       target_date,
       requested_clock_in_at,
       requested_clock_out_at,
       reason,
       status
     ) VALUES ($1, $2, $3, $4, $5, $6, 'pending');`,
    [id, user.memberId, targetDate, requestedClockInAt ?? null, requestedClockOutAt ?? null, reason ?? null],
  );

  return NextResponse.json({ ok: true });
}

// 管理者向け: 修正申請一覧（主に pending）
export async function GET(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await ensureAttendanceTables();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending"; // pending / approved / rejected

  const result = await pool.query(
    `SELECT
       acr.id,
       acr.member_id AS "memberId",
       m.name AS "memberName",
       acr.target_date::date AS "targetDate",
       acr.requested_clock_in_at AS "requestedClockInAt",
       acr.requested_clock_out_at AS "requestedClockOutAt",
       acr.reason,
       acr.status,
       acr.created_at AS "createdAt",
       acr.reviewed_at AS "reviewedAt"
     FROM attendance_change_requests acr
     LEFT JOIN members m ON m.id = acr.member_id
     WHERE acr.status = $1
     ORDER BY acr.created_at ASC;`,
    [status],
  );

  return NextResponse.json({ requests: result.rows });
}
