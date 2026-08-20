import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { hasDatabase } from "@/lib/db";
import { getRecordings, upsertRecording, deleteRecording, RECORDING_SLOTS } from "@/lib/sales-recordings";

// アポ獲得管理リードの商談録音（1回目/2回目/3回目）の取得・登録・削除。
// 録音本体は Vercel Blob。ここは URL とメタ情報の管理と、Blob の後始末を担う。
export const dynamic = "force-dynamic";

function guard() {
  if (!hasDatabase()) return NextResponse.json({ error: "DATABASE_URL が未設定です" }, { status: 503 });
  return null;
}

// ?leadId= で1リード分の録音を返す
export async function GET(req: NextRequest) {
  const blocked = guard();
  if (blocked) return blocked;
  const leadId = Number(new URL(req.url).searchParams.get("leadId"));
  if (!leadId) return NextResponse.json({ error: "leadId が必要です" }, { status: 400 });
  try {
    return NextResponse.json({ recordings: await getRecordings(leadId) });
  } catch (e) {
    console.error("[recording] 取得に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// Blobアップロード完了後、URL とメタ情報をDBに登録（同じ slot は差し替え）
export async function POST(req: NextRequest) {
  const blocked = guard();
  if (blocked) return blocked;
  try {
    const b = (await req.json()) as {
      leadId?: number;
      slot?: number;
      url?: string;
      pathname?: string;
      filename?: string;
      contentType?: string;
      sizeBytes?: number;
    };
    const leadId = Number(b.leadId);
    const slot = Number(b.slot);
    if (!leadId || !RECORDING_SLOTS.includes(slot as (typeof RECORDING_SLOTS)[number]) || !b.url) {
      return NextResponse.json({ error: "leadId, slot(1-3), url が必要です" }, { status: 400 });
    }
    const { oldUrl } = await upsertRecording({
      leadId,
      slot,
      url: b.url,
      pathname: b.pathname ?? null,
      filename: b.filename ?? null,
      contentType: b.contentType ?? null,
      sizeBytes: b.sizeBytes ?? null,
    });
    if (oldUrl) {
      try {
        await del(oldUrl);
      } catch (e) {
        console.error("[recording] 旧Blob削除に失敗:", e);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[recording] 登録に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// 録音を削除（DB + Blob）
export async function DELETE(req: NextRequest) {
  const blocked = guard();
  if (blocked) return blocked;
  try {
    const b = (await req.json()) as { leadId?: number; slot?: number };
    const leadId = Number(b.leadId);
    const slot = Number(b.slot);
    if (!leadId || !slot) return NextResponse.json({ error: "leadId, slot が必要です" }, { status: 400 });
    const { url } = await deleteRecording(leadId, slot);
    if (url) {
      try {
        await del(url);
      } catch (e) {
        console.error("[recording] Blob削除に失敗:", e);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[recording] 削除に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
