// ナーチャリング キャンペーン（メルマガ一斉配信）API。
// GET: 一覧（集計つき）、POST: 作成（下書き）、PATCH: 更新、DELETE: 削除。
// 実送信・テスト送信は /api/nurturing/campaigns/send 側で扱う。
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/lib/nurturing";

export async function GET() {
  await ensureNurturingTables();
  const campaigns = await getCampaigns();
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "キャンペーン名が必要です" }, { status: 400 });
  const campaign = await createCampaign({
    name,
    subject: (body.subject as string) ?? null,
    listId: body.listId == null ? null : Number(body.listId),
  });
  return NextResponse.json({ ok: true, campaign });
}

export async function PATCH(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await updateCampaign(id, (body.patch as Record<string, unknown>) ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
