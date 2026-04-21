import { NextResponse } from "next/server";
import { pool, hasDatabase } from "@/lib/db";
import { ensureAnnouncementsTable } from "@/lib/schema";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json([]);
  }

  await ensureAnnouncementsTable();

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
