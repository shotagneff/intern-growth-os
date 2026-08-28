// シナリオのステップAPI。
// GET ?automationId= : そのシナリオのステップ一覧
// POST  { automationId, delayDays, subject, bodyHtml } : ステップ追加（末尾に付く）
// PATCH { id, patch } : ステップ更新（delayDays/subject/bodyHtml など）
// DELETE ?id= : ステップ削除
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { getSteps, addStep, updateStep, deleteStep } from "@/lib/nurturing";

export async function GET(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const automationId = Number(searchParams.get("automationId"));
  if (!automationId) return NextResponse.json({ ok: false, error: "automationId が必要です" }, { status: 400 });
  const steps = await getSteps(automationId);
  return NextResponse.json({ ok: true, steps });
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const automationId = Number(body.automationId);
  if (!automationId) return NextResponse.json({ ok: false, error: "automationId が必要です" }, { status: 400 });
  const step = await addStep(automationId, {
    delayDays: body.delayDays == null ? 0 : Number(body.delayDays),
    subject: (body.subject as string) ?? null,
    bodyHtml: (body.bodyHtml as string) ?? null,
  });
  return NextResponse.json({ ok: true, step });
}

export async function PATCH(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = Number(body.id);
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await updateStep(id, (body.patch as Record<string, unknown>) ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  await ensureNurturingTables();
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ ok: false, error: "id が必要です" }, { status: 400 });
  await deleteStep(id);
  return NextResponse.json({ ok: true });
}
