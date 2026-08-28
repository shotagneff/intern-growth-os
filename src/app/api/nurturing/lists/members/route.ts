// ナーチャリング リストのメンバー（購読者の所属）API。
// GET ?listId=  : そのリストに属する購読者IDの配列
// POST          : { listId, subscriberIds:number[] } をまとめて追加（重複は無視）
// DELETE ?listId=&subscriberId= : 1件外す
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { getListSubscriberIds, addToList, removeFromList, enrollListMembers } from "@/lib/nurturing";

export async function GET(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const listId = Number(searchParams.get("listId"));
  if (!listId) return NextResponse.json({ ok: false, error: "listId が必要です" }, { status: 400 });
  const ids = await getListSubscriberIds(listId);
  return NextResponse.json({ ok: true, ids });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const listId = Number(body.listId);
  const subscriberIds = Array.isArray(body.subscriberIds)
    ? body.subscriberIds.map((n: unknown) => Number(n)).filter((n: number) => Number.isFinite(n))
    : [];
  if (!listId) return NextResponse.json({ ok: false, error: "listId が必要です" }, { status: 400 });
  await addToList(listId, subscriberIds);
  // 「リスト追加」トリガーの有効なシナリオへ自動登録する
  await enrollListMembers(listId, subscriberIds).catch(() => {});
  return NextResponse.json({ ok: true, added: subscriberIds.length });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const listId = Number(searchParams.get("listId"));
  const subscriberId = Number(searchParams.get("subscriberId"));
  if (!listId || !subscriberId) {
    return NextResponse.json({ ok: false, error: "listId と subscriberId が必要です" }, { status: 400 });
  }
  await removeFromList(listId, subscriberId);
  return NextResponse.json({ ok: true });
}
