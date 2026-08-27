// Resend Webhook（公開）。配信完了・バウンス・苦情の通知を受けて配信明細へ反映する。
// proxy.ts で認証除外。改ざん防止に Svix 署名（Resendが使う）を検証する。
//
// 要設定: Resend の Webhook で「Signing Secret（whsec_...）」を RESEND_WEBHOOK_SECRET に入れる。
// 未設定なら検証できないので 501 を返す（誤ってなりすまし更新されるより安全）。

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ensureNurturingTables } from "@/lib/schema";
import { applyResendEvent } from "@/lib/nurturing";

function verifySvix(secret: string, id: string, ts: string, sigHeader: string, body: string): boolean {
  if (!secret || !id || !ts || !sigHeader) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  const expBuf = Buffer.from(expected);
  // ヘッダは "v1,<b64> v1,<b64>" のように空白区切りで複数入りうる
  return sigHeader.split(" ").some((part) => {
    const s = part.includes(",") ? part.split(",")[1] : part;
    try {
      const b = Buffer.from(s);
      return b.length === expBuf.length && timingSafeEqual(b, expBuf);
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "RESEND_WEBHOOK_SECRET 未設定" }, { status: 501 });
  }

  const body = await req.text();
  const id = req.headers.get("svix-id") ?? "";
  const ts = req.headers.get("svix-timestamp") ?? "";
  const sig = req.headers.get("svix-signature") ?? "";
  if (!verifySvix(secret, id, ts, sig, body)) {
    return NextResponse.json({ ok: false, error: "署名が不正です" }, { status: 401 });
  }

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "JSON parse error" }, { status: 400 });
  }

  const type = event.type ?? "";
  const messageId = event.data?.email_id ?? "";
  if (type && messageId) {
    try {
      await ensureNurturingTables();
      await applyResendEvent(messageId, type);
    } catch {
      // 反映失敗でも 200 を返す（Resend の再送ループを避ける）
    }
  }
  return NextResponse.json({ ok: true });
}
