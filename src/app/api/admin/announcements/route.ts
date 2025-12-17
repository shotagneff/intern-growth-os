import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  category?: string;
  coverImageUrl?: string;
  linkUrl?: string;
  publishedAt?: string;
  authorMemberId?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

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

  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT \'\';');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT \'\';');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS category TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS cover_image_url TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS link_url TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS published_at DATE;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_member_id TEXT;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();');
  await pool.query('ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();');
}

export async function GET() {
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
      active,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM announcements
    ORDER BY active DESC, updated_at DESC;`
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const body = (await req.json()) as Partial<AdminAnnouncement>;

  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const category = String(body.category ?? "").trim() || null;
  const coverImageUrl = String(body.coverImageUrl ?? "").trim() || null;
  const linkUrl = String(body.linkUrl ?? "").trim() || null;
  const publishedAt = String(body.publishedAt ?? "").trim() || null;
  const authorMemberId = String(body.authorMemberId ?? "").trim() || null;
  const active = body.active !== false;

  if (!title || !text) {
    return NextResponse.json(
      { ok: false, error: "title and body are required" },
      { status: 400 }
    );
  }

  const id = body.id?.trim() || randomUUID();

  await pool.query(
    `INSERT INTO announcements (id, title, body, category, cover_image_url, link_url, published_at, author_member_id, active, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      body = EXCLUDED.body,
      category = EXCLUDED.category,
      cover_image_url = EXCLUDED.cover_image_url,
      link_url = EXCLUDED.link_url,
      published_at = EXCLUDED.published_at,
      author_member_id = EXCLUDED.author_member_id,
      active = EXCLUDED.active,
      updated_at = NOW();`,
    [id, title, text, category, coverImageUrl, linkUrl, publishedAt, authorMemberId, active]
  );

  return NextResponse.json({ ok: true, id });
}

export async function PUT(req: NextRequest) {
  await ensureTable();
  const body = (await req.json()) as Partial<AdminAnnouncement>;
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  const category = String(body.category ?? "").trim() || null;
  const coverImageUrl = String(body.coverImageUrl ?? "").trim() || null;
  const linkUrl = String(body.linkUrl ?? "").trim() || null;
  const publishedAt = String(body.publishedAt ?? "").trim() || null;
  const authorMemberId = String(body.authorMemberId ?? "").trim() || null;
  const active = body.active !== false;

  if (!title || !text) {
    return NextResponse.json(
      { ok: false, error: "title and body are required" },
      { status: 400 }
    );
  }

  await pool.query(
    `UPDATE announcements SET
      title = $2,
      body = $3,
      category = $4,
      cover_image_url = $5,
      link_url = $6,
      published_at = $7,
      author_member_id = $8,
      active = $9,
      updated_at = NOW()
    WHERE id = $1;`,
    [id, title, text, category, coverImageUrl, linkUrl, publishedAt, authorMemberId, active]
  );

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  await pool.query(`DELETE FROM announcements WHERE id = $1;`, [id]);
  return NextResponse.json({ ok: true });
}
