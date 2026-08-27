// 配信停止（公開）。メール本文のリンク（GET）と One-Click（POST）から呼ばれる。
// proxy.ts で認証除外にすること（受信者はログインしていない）。
// トークンで購読者を配信解除にし、GET には簡単な確認ページを返す。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { unsubscribeByToken } from "@/lib/nurturing";

function page(title: string, message: string): NextResponse {
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;background:#faf9f7;margin:0;padding:0">
  <div style="max-width:480px;margin:12vh auto;padding:32px;background:#fff;border-radius:16px;box-shadow:0 1px 8px rgba(0,0,0,.06);text-align:center">
    <div style="font-size:13px;letter-spacing:.1em;color:#9e8d70;font-weight:600">SEEKAD</div>
    <h1 style="font-size:18px;margin:12px 0 8px">${title}</h1>
    <p style="font-size:14px;color:#555;line-height:1.7">${message}</p>
  </div>
</body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest) {
  await ensureNurturingTables();
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!token) return page("リンクが無効です", "配信停止用のリンクが正しくありません。");
  const ok = await unsubscribeByToken(token);
  if (!ok) return page("配信停止できませんでした", "既に停止済みか、リンクの有効期限が切れている可能性があります。");
  return page("配信を停止しました", "今後このメールマガジンは届きません。ご登録ありがとうございました。");
}

// One-Click（List-Unsubscribe-Post）
export async function POST(req: NextRequest) {
  await ensureNurturingTables();
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (token) await unsubscribeByToken(token);
  return NextResponse.json({ ok: true });
}
