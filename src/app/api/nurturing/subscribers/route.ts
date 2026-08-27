// ナーチャリング 購読者API。
// GET: 一覧＋集計、POST: 送客/手動追加（email重複は既存を補完）、PATCH: 更新、DELETE: 削除。
// 認証は proxy.ts がログイン必須にする（管理者限定にはしない＝営業全員が送客できる）。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import {
  getSubscribers,
  upsertSubscriber,
  updateSubscriber,
  deleteSubscriber,
  getSummary,
} from "@/lib/nurturing";

export async function GET() {
  await ensureNurturingTables();
  const [subscribers, summary] = await Promise.all([getSubscribers(), getSummary()]);
  return NextResponse.json({ ok: true, subscribers, summary });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = String(body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ ok: false, error: "メールアドレスが必要です" }, { status: 400 });
  }
  const { subscriber, created } = await upsertSubscriber({
    email,
    company: (body.company as string) ?? null,
    name: (body.name as string) ?? null,
    source: (body.source as string) ?? "手動追加",
    leadId: body.leadId == null ? null : Number(body.leadId),
    industry: (body.industry as string) ?? null,
    prefecture: (body.prefecture as string) ?? null,
    owner: (body.owner as string) ?? null,
    note: (body.note as string) ?? null,
  });
  return NextResponse.json({ ok: true, subscriber, created });
}

export async function PATCH(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await updateSubscriber(id, (body.patch as Record<string, unknown>) ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await deleteSubscriber(id);
  return NextResponse.json({ ok: true });
}
