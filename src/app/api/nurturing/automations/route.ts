// ナーチャリング シナリオ（ステップメール）API。
// GET: 一覧（ステップ数・進行中登録数つき）、POST: 作成、PATCH: 更新、DELETE: 削除。
// ステップ自体は /api/nurturing/automations/steps 側で扱う。
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/lib/nurturing";

export async function GET() {
  await ensureNurturingTables();
  const automations = await getAutomations();
  return NextResponse.json({ ok: true, automations });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "シナリオ名が必要です" }, { status: 400 });
  const automation = await createAutomation({
    name,
    trigger: (body.trigger as string) ?? "購読者追加",
    listId: body.listId == null ? null : Number(body.listId),
  });
  return NextResponse.json({ ok: true, automation });
}

export async function PATCH(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await updateAutomation(id, (body.patch as Record<string, unknown>) ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await deleteAutomation(id);
  return NextResponse.json({ ok: true });
}
