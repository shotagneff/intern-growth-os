import { NextRequest, NextResponse } from "next/server";
import { hasCallforce, listLeads, listResponders, updateLead, LEAD_STATUSES, type LeadStatus } from "@/lib/callforce";

// 反響リード（Callforce のデモ通話・広告フォーム）の一覧と更新。
// データは Callforce 側の Supabase にあり、ここでは持たない。
// /api/admin/* は middleware.ts で admin のみに制限されている。

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
    note?: string;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ error: "id が必要です" }, { status: 400 });
  }
  if (body.status && !LEAD_STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: "対応状況の値が不正です" }, { status: 400 });
  }

  try {
    await updateLead(body.id, {
      status: body.status as LeadStatus | undefined,
      assignedTo: body.assignedTo,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[leads] 更新に失敗:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
