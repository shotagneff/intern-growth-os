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

async function ensureHomeCalendarTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_calendar_events (
      id BIGSERIAL PRIMARY KEY,
      date DATE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT,
      apply_url TEXT,
      time TEXT,
      line_keyword TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query('ALTER TABLE home_calendar_events ADD COLUMN IF NOT EXISTS line_keyword TEXT;');
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

function normalizeLocation(place?: string): string {
  if (!place) return "other";
  const p = place.trim();
  if (p.includes("オン") || p.toLowerCase().includes("online")) return "online";
  if (p.includes("大阪")) return "osaka";
  if (p.includes("東京")) return "tokyo";
  return "other";
}

function buildDescription(row: string[]): string {
  const industries = row[7]?.trim(); // H
  const experiences = row[8]?.trim(); // I
  const conceptSummary = row[9]?.trim(); // J
  const companyCount = row[10]?.trim(); // K
  const capacity = row[11]?.trim(); // L
  const target = row[12]?.trim(); // M

  const parts: string[] = [];

  if (conceptSummary) {
    parts.push(`【コンセプト】\n${conceptSummary}`);
  }
  if (experiences) {
    parts.push(`【得られる経験】\n${experiences}`);
  }
  if (industries) {
    parts.push(`【業界】\n${industries}`);
  }
  if (companyCount || capacity) {
    const label = `【参加企業数・定員】`;
    const body = `${companyCount ? `${companyCount}社` : ""}${companyCount && capacity ? " / " : ""}${capacity ? `${capacity}名` : ""}`;
    if (body.trim()) {
      parts.push(`${label}\n${body}`);
    }
  }
  if (target) {
    parts.push(`【おすすめの学生像】\n${target}`);
  }

  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const importTokenHeader = req.headers.get("x-import-token");
  const importTokenEnv = process.env.HOME_CALENDAR_IMPORT_TOKEN;

  if (!importTokenHeader || !importTokenEnv || importTokenHeader !== importTokenEnv) {
    const adminUser = await requireAdmin(req);
    if (!adminUser) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.HOME_CALENDAR_SHEET_ID;
  const sheetRange = process.env.HOME_CALENDAR_SHEET_RANGE;

  if (!apiKey || !sheetId || !sheetRange) {
    return NextResponse.json(
      { error: "GOOGLE_SHEETS_API_KEY / HOME_CALENDAR_SHEET_ID / HOME_CALENDAR_SHEET_RANGE が設定されていません" },
      { status: 500 }
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    sheetRange
  )}?key=${apiKey}`;

  let values: string[][] = [];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Sheets API error: ${res.status} ${res.statusText} ${text}` },
        { status: 500 }
      );
    }
    const data = (await res.json().catch(() => null)) as { values?: string[][] } | null;
    if (!data?.values || data.values.length <= 1) {
      return NextResponse.json({ error: "シートにデータがありません" }, { status: 400 });
    }
    values = data.values;
  } catch (e) {
    console.error("failed to fetch from Sheets", e);
    return NextResponse.json({ error: "Sheets からの取得に失敗しました" }, { status: 500 });
  }

  // 1行目はヘッダー想定
  const rows = values.slice(1);

  const client = await pool.connect();
  let importedCount = 0;

  try {
    await ensureHomeCalendarTable();
    await client.query("BEGIN");
    // jobfair（就活イベント）のみ一括置き換え。それ以外の種別（internal, training など）は残す。
    await client.query("DELETE FROM home_calendar_events WHERE type = 'jobfair';");

    for (const row of rows) {
      if (!row[3] || !row[2]) continue; // D: date, C: programName
      const date = row[3].trim();
      const title = row[2].trim();
      const place = row[4]?.trim();
      const time = row[14]?.trim(); // O（時刻列）
      const reserveUrl = row[13]?.trim(); // N（応募URL）

      // LINE合言葉は常に P 列（index 15）のみを見る。
      // P列が空 or 無い場合は lineKeyword も空として扱う。
      const rawLineKeyword = row[15];
      console.log("LINE KEYWORD DEBUG", { title, date, rawLineKeyword, rowLength: row.length });
      const lineKeyword = rawLineKeyword && typeof rawLineKeyword === "string" ? rawLineKeyword.trim() : "";

      const location = normalizeLocation(place);
      const description = buildDescription(row);

      await client.query(
        `INSERT INTO home_calendar_events (date, title, type, location, description, apply_url, time, line_keyword)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          date,
          title,
          "jobfair",
          location,
          description || null,
          reserveUrl || null,
          time || null,
          lineKeyword || null,
        ]
      );
      importedCount++;
    }

    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("failed to import home_calendar_events from sheet", e);
    return NextResponse.json({ error: "スプレッドシートからのインポートに失敗しました" }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, imported: importedCount });
}
