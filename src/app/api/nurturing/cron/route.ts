// シナリオ（ステップメール）の実行。Vercel Cron から定期的に叩く（例: 15分ごと）。
// proxy.ts で認証除外。CRON_SECRET があれば Authorization: Bearer で保護する。
//
// 送信予定が来た登録を取り出し、そのステップのメールを送って登録を1つ進める。
// 配信停止リンクと List-Unsubscribe は付けるが、開封/クリック計測ピクセルは付けない
// （キャンペーンと違い配信明細を持たないため。必要になれば別途対応）。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import {
  getDueEnrollments,
  advanceEnrollment,
  completeEnrollment,
} from "@/lib/nurturing";
import { sendEmail, hasResend, defaultFrom } from "@/lib/email";

function authorized(req: NextRequest): boolean {
  const secret = String(process.env.CRON_SECRET ?? "").trim();
  if (!secret) return true; // 未設定なら通す（Vercel Cron 専用パス想定）
  const auth = req.headers.get("authorization") ?? "";
  const key = new URL(req.url).searchParams.get("key") ?? "";
  return auth === `Bearer ${secret}` || key === secret;
}

function withUnsubFooter(html: string, url: string): string {
  const footer = `<hr style="margin-top:32px;border:none;border-top:1px solid #eee" />
<p style="font-size:12px;color:#999;text-align:center;margin-top:12px">
  今後このメールの配信を希望しない場合は <a href="${url}" style="color:#999">こちら</a> から配信停止できます。
</p>`;
  return `${html}${footer}`;
}

async function run(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  await ensureNurturingTables();

  if (!hasResend()) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY 未設定" }, { status: 503 });
  }

  const origin = req.nextUrl.origin;
  const due = await getDueEnrollments(200);
  let sent = 0;
  let failed = 0;
  let completed = 0;

  for (const e of due) {
    // 送るステップが無い（＝末尾まで到達）→ 完了にする
    if (!e.step || !e.step.subject || !e.step.bodyHtml) {
      await completeEnrollment(e.enrollmentId);
      completed++;
      continue;
    }
    const url = e.unsubscribeToken
      ? `${origin}/api/nurturing/unsubscribe?token=${encodeURIComponent(e.unsubscribeToken)}`
      : "";
    const html = url ? withUnsubFooter(e.step.bodyHtml, url) : e.step.bodyHtml;
    const result = await sendEmail({
      from: defaultFrom(),
      to: e.email,
      subject: e.step.subject,
      html,
      text: e.step.bodyText ?? undefined,
      headers: url
        ? { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    });
    if (result.ok) sent++;
    else failed++;
    // 送信の成否に関わらず前へ進める（失敗した1通で無限リトライしない）
    await advanceEnrollment(e.enrollmentId);
  }

  return NextResponse.json({ ok: true, processed: due.length, sent, failed, completed });
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
