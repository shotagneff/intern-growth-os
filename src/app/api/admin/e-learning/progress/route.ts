import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTables() {
  if (!process.env.DATABASE_URL) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS elearning_progress (
      login_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      watched BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (login_id, video_id)
    );
  `);

  await pool.query(
    "ALTER TABLE elearning_progress ADD COLUMN IF NOT EXISTS watched BOOLEAN NOT NULL DEFAULT FALSE;"
  );
  await pool.query(
    "ALTER TABLE elearning_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();"
  );

  // videos table exists already via /api/e-learning/videos
  await pool.query(`
    CREATE TABLE IF NOT EXISTS elearning_videos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT,
      url TEXT NOT NULL,
      cover_image_url TEXT,
      section_id INTEGER,
      episode_label TEXT,
      duration_minutes INTEGER,
      instructor_id TEXT,
      instructor_name TEXT,
      material_label TEXT,
      material_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(
    "ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS section_id INTEGER;"
  );
}

export async function GET() {
  if (!process.env.DATABASE_URL) return NextResponse.json([]);

  await ensureTables();

  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM elearning_videos;`
  );
  const totalVideos = Number((totalRes.rows?.[0] as any)?.total ?? 0);

  const sectionTotalsRes = await pool.query(
    `SELECT section_id AS "sectionId", COUNT(*)::int AS "total"
     FROM elearning_videos
     GROUP BY section_id
     ORDER BY section_id NULLS LAST;`
  );
  const sectionTotals = (sectionTotalsRes.rows as Array<any>).map((r) => ({
    sectionId: r.sectionId === null ? null : Number(r.sectionId),
    total: Number(r.total ?? 0),
  }));

  const usersRes = await pool.query(
    `SELECT
      login_id AS "loginId",
      display_name AS "displayName",
      role,
      active
     FROM igos_users
     ORDER BY active DESC, role ASC, login_id ASC;`
  );
  const users = usersRes.rows as Array<any>;

  const watchedCountsRes = await pool.query(
    `SELECT login_id AS "loginId", COUNT(*) FILTER (WHERE watched = TRUE)::int AS "watchedCount"
     FROM elearning_progress
     GROUP BY login_id;`
  );
  const watchedCountByLoginId = new Map<string, number>();
  (watchedCountsRes.rows as Array<any>).forEach((r) => {
    watchedCountByLoginId.set(String(r.loginId), Number(r.watchedCount ?? 0));
  });

  const watchedPerSectionRes = await pool.query(
    `SELECT
      p.login_id AS "loginId",
      v.section_id AS "sectionId",
      COUNT(*) FILTER (WHERE p.watched = TRUE)::int AS "watchedCount"
     FROM elearning_progress p
     JOIN elearning_videos v ON v.id = p.video_id
     GROUP BY p.login_id, v.section_id;`
  );
  const watchedByLoginIdSection = new Map<string, Map<number | null, number>>();
  (watchedPerSectionRes.rows as Array<any>).forEach((r) => {
    const loginId = String(r.loginId);
    const sectionId = r.sectionId === null ? null : Number(r.sectionId);
    const watchedCount = Number(r.watchedCount ?? 0);
    const inner = watchedByLoginIdSection.get(loginId) ?? new Map<number | null, number>();
    inner.set(sectionId, watchedCount);
    watchedByLoginIdSection.set(loginId, inner);
  });

  const lastWatchedRes = await pool.query(
    `SELECT DISTINCT ON (p.login_id)
      p.login_id AS "loginId",
      p.video_id AS "videoId",
      p.updated_at AS "updatedAt",
      v.title AS "videoTitle",
      v.section_id AS "sectionId",
      v.episode_label AS "episodeLabel"
     FROM elearning_progress p
     LEFT JOIN elearning_videos v ON v.id = p.video_id
     WHERE p.watched = TRUE
     ORDER BY p.login_id, p.updated_at DESC;`
  );
  const lastWatchedByLoginId = new Map<
    string,
    {
      videoId: string;
      videoTitle: string | null;
      sectionId: number | null;
      episodeLabel: string | null;
      updatedAt: string;
    }
  >();
  (lastWatchedRes.rows as Array<any>).forEach((r) => {
    const loginId = String(r.loginId);
    lastWatchedByLoginId.set(loginId, {
      videoId: String(r.videoId),
      videoTitle: r.videoTitle ?? null,
      sectionId: r.sectionId === null ? null : Number(r.sectionId),
      episodeLabel: r.episodeLabel ?? null,
      updatedAt: (r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt)) as string,
    });
  });

  const rows = users.map((u) => {
    const loginId = String(u.loginId);
    const watchedCount = watchedCountByLoginId.get(loginId) ?? 0;
    const percent = totalVideos > 0 ? Math.round((watchedCount / totalVideos) * 100) : 0;
    const perSection = sectionTotals
      .filter((s) => s.sectionId !== null)
      .map((s) => {
        const watched = watchedByLoginIdSection.get(loginId)?.get(s.sectionId) ?? 0;
        const p = s.total > 0 ? Math.round((watched / s.total) * 100) : 0;
        return {
          sectionId: s.sectionId,
          watchedCount: watched,
          totalVideos: s.total,
          percent: p,
        };
      });

    return {
      loginId,
      displayName: u.displayName ?? null,
      role: u.role,
      active: u.active,
      watchedCount,
      totalVideos,
      percent,
      perSection,
      lastWatched: lastWatchedByLoginId.get(loginId) ?? null,
    };
  });

  return NextResponse.json(rows);
}
