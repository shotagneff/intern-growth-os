import { NextRequest, NextResponse } from "next/server";
import { getWeekly, getOverrides, setWeekly, setOverride, todayJst } from "@/lib/attendance";

export const dynamic = "force-dynamic";

// 曜日デフォルト（weekly）と、指定日以降の日別上書き（overrides）を返す。
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || todayJst();
  const [weekly, overrides] = await Promise.all([getWeekly(), getOverrides(from)]);
  return NextResponse.json({ weekly, overrides });
}

// weekly（曜日ごと）／override（日別上書き）を保存する。
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (body?.type === "weekly") {
    if (!body.memberId || body.weekday == null) {
      return NextResponse.json({ error: "memberId, weekday は必須です" }, { status: 400 });
    }
    await setWeekly(String(body.memberId), Number(body.weekday), body.startTime ? String(body.startTime) : null);
    return NextResponse.json({ ok: true });
  }
  if (body?.type === "override") {
    if (!body.memberId || !body.date) {
      return NextResponse.json({ error: "memberId, date は必須です" }, { status: 400 });
    }
    await setOverride(
      String(body.memberId),
      String(body.date),
      body.startTime ? String(body.startTime) : null,
      Boolean(body.isOff)
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "type は weekly | override です" }, { status: 400 });
}
