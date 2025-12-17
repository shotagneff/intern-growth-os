import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function normalizeGoogleSheetsCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("output=csv")) return trimmed;

  try {
    const u = new URL(trimmed);
    if (u.pathname.endsWith("/pubhtml")) {
      u.pathname = u.pathname.replace(/\/pubhtml$/, "/pub");
      u.searchParams.set("output", "csv");
      return u.toString();
    }

    if (u.pathname.endsWith("/pub")) {
      u.searchParams.set("output", "csv");
      return u.toString();
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

type SheetEventRow = {
  id: string;
  companyName?: string;
  programName?: string;
  date?: string;
  place?: string;
  venue?: string;
  type?: string;
  industries?: string;
  experiences?: string;
  conceptSummary?: string;
  companyCount?: number | null;
  capacity?: number | null;
  target?: string;
  reserveUrl?: string;
  time?: string;
  lineKeyword?: string;
};

async function ensureAdminEventsTable() {
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
}

async function fetchAdminEvents(): Promise<SheetEventRow[]> {
  if (!process.env.DATABASE_URL) return [];
  await ensureAdminEventsTable();

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
      line_keyword AS "lineKeyword"
    FROM admin_events
    ORDER BY date ASC NULLS LAST, updated_at DESC;`
  );

  return (result.rows as SheetEventRow[]).map((r) => ({
    ...r,
    id: `admin:${r.id}`,
  }));
}

function parseNumberOrNull(raw: string | undefined): number | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeHeaderKey(raw: string): string {
  return raw
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/[\s　]+/g, "")
    .replace(/[()（）]/g, "")
    .toLowerCase();
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out;
}

function parseCsv(csv: string): SheetEventRow[] {
  const lines = csv
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const delimiter = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headerCols = parseCsvLine(lines[0], delimiter);
  const header = headerCols.map((h) => normalizeHeaderKey(h));

  const idx = (name: string) => header.indexOf(normalizeHeaderKey(name));
  const idxAny = (names: string[]) => {
    for (const n of names) {
      const i = idx(n);
      if (i >= 0) return i;
    }
    return -1;
  };

  const iId = idxAny(["id", "ID", "識別子"]);
  if (iId < 0) return [];

  const iCompanyName = idxAny(["companyName", "company", "企業名", "会社名"]);
  const iProgramName = idxAny(["programName", "program", "イベント名", "プログラム名"]);
  const iDate = idxAny(["date", "日付", "開催日"]);
  const iPlace = idxAny(["place", "場所", "開催場所"]);
  const iVenue = idxAny(["venue", "会場", "会場名"]);
  const iType = idxAny(["type", "種別", "カテゴリ", "カテゴリー"]);
  const iIndustries = idxAny(["industries", "industry", "業界"]);
  const iExperiences = idxAny(["experiences", "experience", "経験", "求める経験"]);
  const iConceptSummary = idxAny(["conceptSummary", "concept", "コンセプト", "コンセプト概要"]);
  const iCompanyCount = idxAny(["companyCount", "company_count", "参加企業数", "企業数"]);
  const iCapacity = idxAny(["capacity", "定員", "募集定員"]);
  const iTarget = idxAny(["target", "おすすめの学生像", "おすすめ学生像", "対象"]);
  const iReserveUrl = idxAny(["reserveUrl", "reserve_url", "予約URL", "予約url", "予約リンク", "予約"]);
  const iTime = idxAny(["time", "時間", "開催時間"]);
  const iLineKeyword = idxAny(["lineKeyword", "line_keyword", "応募キーワード", "キーワード"]);

  const get = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line, delimiter);
    return {
      id: get(cols, iId),
      companyName: get(cols, iCompanyName) || undefined,
      programName: get(cols, iProgramName) || undefined,
      date: get(cols, iDate) || undefined,
      place: get(cols, iPlace) || undefined,
      venue: get(cols, iVenue) || undefined,
      type: get(cols, iType) || undefined,
      industries: get(cols, iIndustries) || undefined,
      experiences: get(cols, iExperiences) || undefined,
      conceptSummary: get(cols, iConceptSummary) || undefined,
      companyCount: parseNumberOrNull(get(cols, iCompanyCount)),
      capacity: parseNumberOrNull(get(cols, iCapacity)),
      target: get(cols, iTarget) || undefined,
      reserveUrl: get(cols, iReserveUrl) || undefined,
      time: get(cols, iTime) || undefined,
      lineKeyword: get(cols, iLineKeyword) || undefined,
    };
  });
}

export async function GET() {
  try {
    const url = process.env.EVENTS_CSV_URL;

    let sheetRows: SheetEventRow[] = [];
    if (url) {
      const normalized = normalizeGoogleSheetsCsvUrl(url);
      const res = await fetch(normalized, { cache: "no-store" });
      if (res.ok) {
        const text = await res.text();
        sheetRows = parseCsv(text).filter((r) => r.id);
      }
    }

    const adminRows = await fetchAdminEvents();

    const merged = [...adminRows, ...sheetRows].sort((a, b) =>
      (a.date ?? "").localeCompare(b.date ?? "")
    );

    return NextResponse.json(merged);
  } catch (e) {
    console.error("failed to fetch events csv", e);
    try {
      const adminRows = await fetchAdminEvents();
      return NextResponse.json(adminRows);
    } catch {
      return NextResponse.json([]);
    }
  }
}
