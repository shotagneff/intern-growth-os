// アポ獲得管理のリードに紐づく商談録音（1回目/2回目/3回目）のDBアクセス。サーバー専用。
//
// 録音本体は Vercel Blob に置き、ここには URL とメタ情報だけを持つ。
// slot は 1〜3（何回目の商談か）。lead_id と slot の組で1つ。差し替えは upsert。
import { pool } from "@/lib/db";
import { ensureSalesRecordingsTable } from "@/lib/schema";

export type SalesRecording = {
  leadId: number;
  slot: number;
  url: string;
  pathname: string | null;
  filename: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
};

export const RECORDING_SLOTS = [1, 2, 3] as const;

function toRecording(r: Record<string, unknown>): SalesRecording {
  return {
    leadId: Number(r.lead_id),
    slot: Number(r.slot),
    url: String(r.url),
    pathname: (r.pathname as string) ?? null,
    filename: (r.filename as string) ?? null,
    contentType: (r.content_type as string) ?? null,
    sizeBytes: r.size_bytes === null || r.size_bytes === undefined ? null : Number(r.size_bytes),
    uploadedAt: r.uploaded_at ? new Date(r.uploaded_at as string).toISOString() : null,
  };
}

/** 1リード分の録音（slot昇順） */
export async function getRecordings(leadId: number): Promise<SalesRecording[]> {
  await ensureSalesRecordingsTable();
  const r = await pool.query(
    "SELECT * FROM sales_recordings WHERE lead_id = $1 ORDER BY slot",
    [leadId]
  );
  return r.rows.map(toRecording);
}

/** 全リードの録音件数（一覧のバッジ用）。lead_id -> 件数 */
export async function getRecordingCounts(): Promise<Record<number, number>> {
  await ensureSalesRecordingsTable();
  const r = await pool.query("SELECT lead_id, COUNT(*)::int AS n FROM sales_recordings GROUP BY lead_id");
  const out: Record<number, number> = {};
  for (const row of r.rows) out[Number(row.lead_id)] = Number(row.n);
  return out;
}

/** 録音を登録/差し替え（同じ lead_id, slot は上書き）。旧 pathname を返す（あればBlob削除に使う） */
export async function upsertRecording(rec: {
  leadId: number;
  slot: number;
  url: string;
  pathname?: string | null;
  filename?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
}): Promise<{ oldUrl: string | null }> {
  await ensureSalesRecordingsTable();
  const prev = await pool.query(
    "SELECT url FROM sales_recordings WHERE lead_id = $1 AND slot = $2",
    [rec.leadId, rec.slot]
  );
  const oldUrl = prev.rows[0]?.url ?? null;
  await pool.query(
    `INSERT INTO sales_recordings (lead_id, slot, url, pathname, filename, content_type, size_bytes, uploaded_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
     ON CONFLICT (lead_id, slot) DO UPDATE SET
       url = EXCLUDED.url, pathname = EXCLUDED.pathname, filename = EXCLUDED.filename,
       content_type = EXCLUDED.content_type, size_bytes = EXCLUDED.size_bytes, uploaded_at = NOW()`,
    [rec.leadId, rec.slot, rec.url, rec.pathname ?? null, rec.filename ?? null, rec.contentType ?? null, rec.sizeBytes ?? null]
  );
  return { oldUrl: oldUrl && oldUrl !== rec.url ? oldUrl : null };
}

/** 録音を削除。Blob削除用に url を返す */
export async function deleteRecording(leadId: number, slot: number): Promise<{ url: string | null }> {
  await ensureSalesRecordingsTable();
  const r = await pool.query(
    "DELETE FROM sales_recordings WHERE lead_id = $1 AND slot = $2 RETURNING url",
    [leadId, slot]
  );
  return { url: r.rows[0]?.url ?? null };
}
