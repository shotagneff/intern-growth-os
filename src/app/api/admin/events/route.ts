import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { randomUUID } from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type AdminEvent = {
  id: string;
  companyName?: string;
  programName?: string;
  date?: string;
  place?: string;
  venue?: string;
  type?: string;
  industries?: string;
  conceptSummary?: string;
  companyCount?: number | null;
  capacity?: number | null;
  target?: string;
  reserveUrl?: string;
  time?: string;
  lineKeyword?: string;
  updatedAt?: string;
};

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_events (
      id TEXT PRIMARY KEY,
      company_name TEXT,
      program_name TEXT,
      date TEXT,
      place TEXT,
      venue TEXT,
      type TEXT,
      industries TEXT,
      concept_summary TEXT,
      company_count INTEGER,
      capacity INTEGER,
      target TEXT,
      reserve_url TEXT,
      time TEXT,
      line_keyword TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS company_name TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS program_name TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS date TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS place TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS venue TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS type TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS industries TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS concept_summary TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS company_count INTEGER;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS capacity INTEGER;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS target TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS reserve_url TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS time TEXT;');
  await pool.query('ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS line_keyword TEXT;');
  await pool.query(
    'ALTER TABLE admin_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();'
  );
}

function toRowPatch(body: Partial<AdminEvent>) {
  return {
    company_name: body.companyName ?? null,
    program_name: body.programName ?? null,
    date: body.date ?? null,
    place: body.place ?? null,
    venue: body.venue ?? null,
    type: body.type ?? null,
    industries: body.industries ?? null,
    concept_summary: body.conceptSummary ?? null,
    company_count: body.companyCount ?? null,
    capacity: body.capacity ?? null,
    target: body.target ?? null,
    reserve_url: body.reserveUrl ?? null,
    time: body.time ?? null,
    line_keyword: body.lineKeyword ?? null,
  };
}

export async function GET() {
  await ensureTable();
  const result = await pool.query(
    `SELECT
      id,
      company_name AS "companyName",
      program_name AS "programName",
      date,
      place,
      venue,
      type,
      industries,
      concept_summary AS "conceptSummary",
      company_count AS "companyCount",
      capacity,
      target,
      reserve_url AS "reserveUrl",
      time,
      line_keyword AS "lineKeyword",
      updated_at AS "updatedAt"
    FROM admin_events
    ORDER BY date ASC NULLS LAST, updated_at DESC;`
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureTable();
  const body = (await req.json()) as Partial<AdminEvent>;
  const id = body.id?.trim() || randomUUID();
  const patch = toRowPatch(body);

  await pool.query(
    `INSERT INTO admin_events (
      id,
      company_name,
      program_name,
      date,
      place,
      venue,
      type,
      industries,
      concept_summary,
      company_count,
      capacity,
      target,
      reserve_url,
      time,
      line_keyword,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      program_name = EXCLUDED.program_name,
      date = EXCLUDED.date,
      place = EXCLUDED.place,
      venue = EXCLUDED.venue,
      type = EXCLUDED.type,
      industries = EXCLUDED.industries,
      concept_summary = EXCLUDED.concept_summary,
      company_count = EXCLUDED.company_count,
      capacity = EXCLUDED.capacity,
      target = EXCLUDED.target,
      reserve_url = EXCLUDED.reserve_url,
      time = EXCLUDED.time,
      line_keyword = EXCLUDED.line_keyword,
      updated_at = NOW();`,
    [
      id,
      patch.company_name,
      patch.program_name,
      patch.date,
      patch.place,
      patch.venue,
      patch.type,
      patch.industries,
      patch.concept_summary,
      patch.company_count,
      patch.capacity,
      patch.target,
      patch.reserve_url,
      patch.time,
      patch.line_keyword,
    ]
  );

  return NextResponse.json({ ok: true, id });
}

export async function PUT(req: NextRequest) {
  await ensureTable();
  const body = (await req.json()) as Partial<AdminEvent>;
  const id = body.id?.trim();
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  const patch = toRowPatch(body);

  await pool.query(
    `UPDATE admin_events SET
      company_name = $2,
      program_name = $3,
      date = $4,
      place = $5,
      venue = $6,
      type = $7,
      industries = $8,
      concept_summary = $9,
      company_count = $10,
      capacity = $11,
      target = $12,
      reserve_url = $13,
      time = $14,
      line_keyword = $15,
      updated_at = NOW()
    WHERE id = $1;`,
    [
      id,
      patch.company_name,
      patch.program_name,
      patch.date,
      patch.place,
      patch.venue,
      patch.type,
      patch.industries,
      patch.concept_summary,
      patch.company_count,
      patch.capacity,
      patch.target,
      patch.reserve_url,
      patch.time,
      patch.line_keyword,
    ]
  );

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: NextRequest) {
  await ensureTable();
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });

  await pool.query(`DELETE FROM admin_events WHERE id = $1;`, [id]);
  return NextResponse.json({ ok: true });
}
