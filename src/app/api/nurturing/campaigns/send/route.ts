// ナーチャリング キャンペーンの送信。
// POST { campaignId, testTo }        → テスト送信（testTo 宛に1通だけ。明細は残さない）
// POST { campaignId }                → 本送信（対象を展開し、queued を順に送る）
//
// 送信は Resend（email.ts）。1通ずつ結果を明細へ記録し、最後に集計と状態を更新する。
// 配信停止リンク（公開ページ /api/nurturing/unsubscribe）と List-Unsubscribe を必ず付ける。
// 認証は proxy.ts がログイン必須にする。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import {
  getCampaign,
  buildRecipients,
  getQueuedRecipients,
  markRecipientSent,
  markCampaignSending,
  markCampaignSent,
  recountCampaign,
  getUnsubscribeTokenMap,
} from "@/lib/nurturing";
import { sendEmail, hasResend, defaultFrom } from "@/lib/email";
import { openPixelTag, wrapLinksForClickTracking } from "@/lib/nurturing-track";

function unsubscribeUrl(origin: string, token: string): string {
  return `${origin}/api/nurturing/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** 本文の末尾に配信停止フッタを足す（HTML）。トークンが無ければ付けない */
function withUnsubFooter(html: string, url: string | null): string {
  if (!url) return html;
  const footer = `<hr style="margin-top:32px;border:none;border-top:1px solid #eee" />
<p style="font-size:12px;color:#999;text-align:center;margin-top:12px">
  今後このメールの配信を希望しない場合は <a href="${url}" style="color:#999">こちら</a> から配信停止できます。
</p>`;
  return `${html}${footer}`;
}

export async function POST(req: NextRequest) {
  await ensureNurturingTables();

  if (!hasResend()) {
    return NextResponse.json(
      { ok: false, error: "送信基盤が未設定です。環境変数 RESEND_API_KEY を設定してください。" },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const campaignId = Number(body.campaignId);
  if (!campaignId) return NextResponse.json({ ok: false, error: "campaignId が必要です" }, { status: 400 });

  const campaign = await getCampaign(campaignId);
  if (!campaign) return NextResponse.json({ ok: false, error: "キャンペーンが見つかりません" }, { status: 404 });
  if (!campaign.subject) return NextResponse.json({ ok: false, error: "件名が未設定です" }, { status: 400 });
  if (!campaign.bodyHtml) return NextResponse.json({ ok: false, error: "本文が未設定です" }, { status: 400 });

  const from = defaultFrom(campaign.fromName, campaign.fromEmail);
  const origin = req.nextUrl.origin;

  // --- テスト送信 -----------------------------------------------------------
  const testTo = typeof body.testTo === "string" ? body.testTo.trim() : "";
  if (testTo) {
    const result = await sendEmail({
      from,
      to: testTo,
      subject: `[テスト] ${campaign.subject}`,
      html: withUnsubFooter(campaign.bodyHtml, null),
      text: campaign.bodyText ?? undefined,
      replyTo: campaign.replyTo,
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    return NextResponse.json({ ok: true, test: true, id: result.id });
  }

  // --- 本送信 ---------------------------------------------------------------
  if (campaign.status === "送信済" || campaign.status === "送信中") {
    return NextResponse.json({ ok: false, error: `既に${campaign.status}です` }, { status: 409 });
  }

  await buildRecipients(campaign);
  await markCampaignSending(campaignId);

  const queued = await getQueuedRecipients(campaignId);
  const tokens = await getUnsubscribeTokenMap(queued.map((r) => r.subscriberId));

  let sent = 0;
  let failed = 0;
  for (const r of queued) {
    const token = tokens[r.subscriberId] || "";
    const url = token ? unsubscribeUrl(origin, token) : null;
    // 本文リンクをクリック計測で包む → 配信停止フッタを足す（包まない）→ 開封ピクセルを付ける
    let html = wrapLinksForClickTracking(campaign.bodyHtml, origin, r.id);
    html = withUnsubFooter(html, url);
    html = `${html}${openPixelTag(origin, r.id)}`;
    const result = await sendEmail({
      from,
      to: r.email,
      subject: campaign.subject,
      html,
      text: campaign.bodyText ?? undefined,
      replyTo: campaign.replyTo,
      headers: url ? { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
    });
    await markRecipientSent(r.id, {
      ok: result.ok,
      providerMessageId: result.ok ? result.id : null,
      error: result.ok ? null : result.error,
    });
    if (result.ok) sent++;
    else failed++;
  }

  await recountCampaign(campaignId);
  await markCampaignSent(campaignId);

  return NextResponse.json({ ok: true, sent, failed, total: queued.length });
}
