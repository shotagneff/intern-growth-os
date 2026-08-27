// ナーチャリング リストAPI（セグメント）。
// GET: 一覧（所属人数つき）、POST: 作成、PATCH: 更新、DELETE: 削除。
// 認証は proxy.ts がログイン必須にする（営業全員が扱える）。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { getLists, createList, updateList, deleteList } from "@/lib/nurturing";

export async function GET() {
  await ensureNurturingTables();
  const lists = await getLists();
  return NextResponse.json({ ok: true, lists });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "リスト名が必要です" }, { status: 400 });
  }
  const list = await createList({
    name,
    description: (body.description as string) ?? null,
    color: (body.color as string) ?? null,
  });
  return NextResponse.json({ ok: true, list });
}

export async function PATCH(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await updateList(id, (body.patch as Record<string, unknown>) ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await deleteList(id);
  return NextResponse.json({ ok: true });
}
