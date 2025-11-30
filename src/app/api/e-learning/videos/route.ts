import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// テーブルがなければ作成するヘルパー
async function ensureTable() {
  // ベーステーブルがなければ作成
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
      instructor_name TEXT,
      material_label TEXT,
      material_url TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 既存テーブル向けに不足カラムを追加（古い環境でも動くように）
  await pool.query(
    'ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS material_label TEXT;'
  );
  await pool.query(
    'ALTER TABLE elearning_videos ADD COLUMN IF NOT EXISTS material_url TEXT;'
  );
}

export async function GET() {
  await ensureTable();

  const result = await pool.query(
    `SELECT
      id,
      title,
      category,
      url,
      cover_image_url AS "coverImageUrl",
      section_id AS "sectionId",
      episode_label AS "episodeLabel",
      duration_minutes AS "durationMinutes",
      instructor_name AS "instructorName",
      material_label AS "materialLabel",
      material_url AS "materialUrl",
      updated_at AS "updatedAt"
    FROM elearning_videos
    ORDER BY section_id NULLS LAST, episode_label NULLS LAST, updated_at ASC;`
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureTable();

  const body = await req.json();
  const {
    id,
    title,
    category,
    url,
    coverImageUrl,
    sectionId,
    episodeLabel,
    durationMinutes,
    instructorName,
    materialLabel,
    materialUrl,
  } = body ?? {};

  if (!id || !title || !url) {
    return NextResponse.json({ error: "id, title, url は必須です" }, { status: 400 });
  }

  await pool.query(
    `INSERT INTO elearning_videos (
      id,
      title,
      category,
      url,
      cover_image_url,
      section_id,
      episode_label,
      duration_minutes,
      instructor_name,
      material_label,
      material_url,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      url = EXCLUDED.url,
      cover_image_url = EXCLUDED.cover_image_url,
      section_id = EXCLUDED.section_id,
      episode_label = EXCLUDED.episode_label,
      duration_minutes = EXCLUDED.duration_minutes,
      instructor_name = EXCLUDED.instructor_name,
      material_label = EXCLUDED.material_label,
      material_url = EXCLUDED.material_url,
      updated_at = NOW();`,
    [
      id,
      title,
      category,
      url,
      coverImageUrl,
      sectionId,
      episodeLabel,
      durationMinutes,
      instructorName,
      materialLabel,
      materialUrl,
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  await ensureTable();

  const body = await req.json();
  const {
    id,
    title,
    category,
    url,
    coverImageUrl,
    sectionId,
    episodeLabel,
    durationMinutes,
    instructorName,
    materialLabel,
    materialUrl,
  } = body ?? {};

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  await pool.query(
    `UPDATE elearning_videos
     SET
       title = COALESCE($2, title),
       category = COALESCE($3, category),
       url = COALESCE($4, url),
       cover_image_url = COALESCE($5, cover_image_url),
       section_id = COALESCE($6, section_id),
       episode_label = COALESCE($7, episode_label),
       duration_minutes = COALESCE($8, duration_minutes),
       instructor_name = COALESCE($9, instructor_name),
       material_label = COALESCE($10, material_label),
       material_url = COALESCE($11, material_url),
       updated_at = NOW()
     WHERE id = $1;`,
    [
      id,
      title,
      category,
      url,
      coverImageUrl,
      sectionId,
      episodeLabel,
      durationMinutes,
      instructorName,
      materialLabel,
      materialUrl,
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  await pool.query(`DELETE FROM elearning_videos WHERE id = $1;`, [id]);

  return NextResponse.json({ ok: true });
}
