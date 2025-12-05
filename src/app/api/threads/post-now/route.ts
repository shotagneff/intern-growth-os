import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureUsersTable() {
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
}

async function requireAdmin(req: NextRequest) {
  const userId = req.cookies.get("ig_user_id")?.value;
  if (!userId) return null;

  await ensureUsersTable();

  const result = await pool.query(
    `SELECT id, is_admin FROM users WHERE id = $1 LIMIT 1;`,
    [userId]
  );

  if (result.rows.length === 0) return null;
  const user = result.rows[0] as { id: string; is_admin: boolean };
  if (!user.is_admin) return null;
  return user;
}

async function postToThreads(text: string) {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  const userId = process.env.THREADS_USER_ID;

  if (!accessToken || !userId) {
    throw new Error("Threads API の環境変数 (THREADS_ACCESS_TOKEN / THREADS_USER_ID) が設定されていません");
  }

  const res = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ text, media_type: "text" }).toString(),
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Threads API error: ${res.status} ${res.statusText} ${bodyText}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  const adminUser = await requireAdmin(req);
  if (!adminUser) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = body?.text as string | undefined;

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text は必須です" }, { status: 400 });
  }

  try {
    const result = await postToThreads(text);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("post-now failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Threads API 呼び出しに失敗しました" },
      { status: 500 }
    );
  }
}
