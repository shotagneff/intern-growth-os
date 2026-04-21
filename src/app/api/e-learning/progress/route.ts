import { NextRequest, NextResponse } from "next/server";
import { pool, hasDatabase } from "@/lib/db";
import { ensureElearningProgressTable } from "@/lib/schema";
import { verifySessionToken } from "@/lib/auth-token";

export const runtime = "nodejs";

const COOKIE_NAME = "igos_session";

async function getLoginId(req: NextRequest): Promise<string | null> {
  const secret = String(process.env.IGOS_AUTH_SECRET ?? "").trim();
  if (!secret) return null;

  const token = req.cookies.get(COOKIE_NAME)?.value ?? "";
  if (!token) return null;

  const payload = await verifySessionToken(token, secret);
  return payload?.loginId ?? null;
}

export async function GET(req: NextRequest) {
  if (!hasDatabase()) return NextResponse.json({ ok: true, watchedVideoIds: [] });

  const loginId = await getLoginId(req);
  if (!loginId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  await ensureElearningProgressTable();

  const result = await pool.query(
    `SELECT video_id AS "videoId" FROM elearning_progress WHERE login_id = $1 AND watched = TRUE;`,
    [loginId]
  );

  const watchedVideoIds = (result.rows as Array<{ videoId: string }>).map((r) => r.videoId);
  return NextResponse.json({ ok: true, watchedVideoIds });
}

export async function POST(req: NextRequest) {
  if (!hasDatabase()) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const loginId = await getLoginId(req);
  if (!loginId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  await ensureElearningProgressTable();

  const body = (await req.json().catch(() => ({}))) as {
    videoId?: string;
    watched?: boolean;
  };

  const videoId = String(body.videoId ?? "").trim();
  if (!videoId) {
    return NextResponse.json({ ok: false, error: "videoId is required" }, { status: 400 });
  }

  const watched = body.watched === true;

  await pool.query(
    `INSERT INTO elearning_progress (login_id, video_id, watched, updated_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (login_id, video_id) DO UPDATE SET
      watched = EXCLUDED.watched,
      updated_at = NOW();`,
    [loginId, videoId, watched]
  );

  return NextResponse.json({ ok: true });
}
