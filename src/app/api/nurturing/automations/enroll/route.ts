// 手動シナリオ適用。購読者一覧から「この購読者に・このシナリオを・この日から」開始する。
// POST { automationId, subscriberId, startDate? }  startDate は YYYY-MM-DD（JST）。省略時は1ステップ目のdelayに従う。
// 既に登録済みでも最初から流し直す。ステップが無いシナリオは適用不可（400）。
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { enrollSubscriberAt } from "@/lib/nurturing";

export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const automationId = Number(body.automationId);
  const subscriberId = Number(body.subscriberId);
  const startDate = typeof body.startDate === "string" && body.startDate ? body.startDate : null;
  if (!automationId || !subscriberId) {
    return NextResponse.json({ ok: false, error: "automationId と subscriberId が必要です" }, { status: 400 });
  }
  const ok = await enrollSubscriberAt(automationId, subscriberId, startDate);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "このシナリオにはステップがありません。先にステップを追加してください。" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
