import { NextRequest, NextResponse } from "next/server";
import {
  hasCallforce,
  listLeads,
  listResponders,
  updateLead,
  saveContactNote,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/callforce";

// 反響リード（Callforce のデモ通話・広告フォーム）の一覧と更新。
// データは Callforce 側の Supabase にあり、ここでは持たない。
//
// 管理者限定にはしない。反響は手が空いている人が拾うのが一番早く、
// 担当に指名された人しか見られないと初動が遅れる。
// ただしログインは必須（proxy.ts が /login と /api/auth 以外を保護している）。

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasCallforce()) {
    return NextResponse.json(
      { error: "CALLFORCE_SUPABASE_URL / CALLFORCE_SUPABASE_SERVICE_KEY が未設定です" },
      { status: 503 }
    );
  }
  try {
    const [leads, responders] = await Promise.all([listLeads(), listResponders()]);
    return NextResponse.json({ leads, responders });
  } catch (e) {
    console.error("[leads] 取得に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!hasCallforce()) {
    return NextResponse.json({ error: "Callforce 未設定" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: string;
    assignedTo?: string;
    /** 電話番号に紐づくメモ。phoneNumber とセットで送る */
    note?: string;
    phoneNumber?: string;
    /** 次回連絡日（YYYY-MM-DD）。null で解除 */
    nextActionAt?: string | null;
  } | null;

  if (!body) {
    return NextResponse.json({ error: "本文が読めません" }, { status: 400 });
  }
  if (body.status && !LEAD_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: "対応状況の値が不正です" }, { status: 400 });
  }

  try {
    // メモは電話番号に紐づく。1件のリードではなく、その番号に対して保存する
    if (body.note !== undefined) {
      if (!body.phoneNumber) {
        return NextResponse.json({ error: "電話番号が必要です" }, { status: 400 });
      }
      await saveContactNote(body.phoneNumber, body.note);
    }

    if (
      body.status !== undefined ||
      body.assignedTo !== undefined ||
      body.nextActionAt !== undefined
    ) {
      if (!body.id) {
        return NextResponse.json({ error: "id が必要です" }, { status: 400 });
      }
      await updateLead(body.id, {
        status: body.status as LeadStatus | undefined,
        assignedTo: body.assignedTo,
        nextActionAt: body.nextActionAt,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[leads] 更新に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
