import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTables() {
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_learning_progress (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watched_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, video_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS e_learning_section2_checklist (
      user_id TEXT PRIMARY KEY,
      survey BOOLEAN DEFAULT FALSE,
      line   BOOLEAN DEFAULT FALSE,
      prokin BOOLEAN DEFAULT FALSE,
      drive  BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await ensureTables();

  const result = await pool.query(
    `SELECT video_id FROM e_learning_progress WHERE user_id = $1;`,
    [userId]
  );

  const watchedVideoIds = result.rows.map((r) => r.video_id as string);

  const checklistResult = await pool.query(
    `SELECT survey, line, prokin, drive
       FROM e_learning_section2_checklist
      WHERE user_id = $1;`,
    [userId]
  );

  const row = checklistResult.rows[0];
  const section2Checklist = row
    ? {
        survey: !!row.survey,
        line: !!row.line,
        prokin: !!row.prokin,
        drive: !!row.drive,
      }
    : { survey: false, line: false, prokin: false, drive: false };

  return NextResponse.json({ watchedVideoIds, section2Checklist });
}

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const videoId = body?.videoId as string | undefined;
  const section2Checklist = body?.section2Checklist as
    | { survey?: boolean; line?: boolean; prokin?: boolean; drive?: boolean }
    | undefined;

  await ensureTables();

  if (videoId) {
    await pool.query(
      `INSERT INTO e_learning_progress (user_id, video_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, video_id) DO UPDATE SET watched_at = NOW();`,
      [userId, videoId]
    );
  }

  if (section2Checklist) {
    const { survey, line, prokin, drive } = section2Checklist;

    await pool.query(
      `INSERT INTO e_learning_section2_checklist (user_id, survey, line, prokin, drive, updated_at)
       VALUES ($1, COALESCE($2, FALSE), COALESCE($3, FALSE), COALESCE($4, FALSE), COALESCE($5, FALSE), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         survey = COALESCE($2, e_learning_section2_checklist.survey),
         line   = COALESCE($3, e_learning_section2_checklist.line),
         prokin = COALESCE($4, e_learning_section2_checklist.prokin),
         drive  = COALESCE($5, e_learning_section2_checklist.drive),
         updated_at = NOW();`,
      [userId, survey, line, prokin, drive]
    );
  }

  return NextResponse.json({ ok: true });
}
