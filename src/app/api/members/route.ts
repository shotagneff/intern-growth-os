import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureMembersTable } from "@/lib/schema";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  await ensureMembersTable();

  const result = await pool.query(
    `SELECT
      id,
      name,
      team,
      role,
      icon_url AS "iconUrl",
      active,
      updated_at AS "updatedAt"
    FROM members
    WHERE active = TRUE
    ORDER BY updated_at DESC;`,
  );

  return NextResponse.json(result.rows);
}
