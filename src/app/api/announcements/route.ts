import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT,
      cover_image_url TEXT,
      link_url TEXT,
      published_at DATE,
      author_member_id TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  await ensureTable();

  const result = await pool.query(
    `SELECT
      id,
      title,
      body,
      category,
      cover_image_url AS "coverImageUrl",
      link_url AS "linkUrl",
      published_at::text AS "publishedAt",
      author_member_id AS "authorMemberId",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM announcements
    WHERE active = TRUE
    ORDER BY updated_at DESC;`
  );

  return NextResponse.json(result.rows);
}
