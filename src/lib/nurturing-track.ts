// 開封/クリック計測リンクの署名。サーバ専用。
//
// トラッキングURLは受信者IDを含むが、そのままだと第三者が総当たりで
// 開封/クリックを捏造できる。またクリック計測はリダイレクト先URLを持つため、
// 署名を検証しないとフィッシングの踏み台（オープンリダイレクト）にされる。
// そこで IGOS_AUTH_SECRET でHMAC署名し、リンクごとに検証する。

import { createHmac } from "node:crypto";

function secret(): string {
  return String(process.env.IGOS_AUTH_SECRET ?? "").trim();
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url").slice(0, 20);
}

/** 一致比較（長さが違えば即false。短いので簡易比較で十分） */
function eq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function signOpen(recipientId: number): string {
  return sign(`open:${recipientId}`);
}
export function verifyOpen(recipientId: number, sig: string): boolean {
  return !!secret() && eq(sig, signOpen(recipientId));
}

export function signClick(recipientId: number, url: string): string {
  return sign(`click:${recipientId}:${url}`);
}
export function verifyClick(recipientId: number, url: string, sig: string): boolean {
  return !!secret() && eq(sig, signClick(recipientId, url));
}

/** 開封計測用の透明ピクセル img タグ。本文末尾に付ける */
export function openPixelTag(origin: string, recipientId: number): string {
  const url = `${origin}/api/nurturing/track/open?r=${recipientId}&s=${signOpen(recipientId)}`;
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;width:1px;height:1px" />`;
}

/**
 * 本文中の http(s) リンクをクリック計測URLで包む（クリックラップ）。
 * href="..."（ダブルクオート）だけを対象にする。配信停止フッタは
 * これを通した後に足すので包まれない。
 */
export function wrapLinksForClickTracking(html: string, origin: string, recipientId: number): string {
  return html.replace(/href\s*=\s*"(https?:\/\/[^"]+)"/gi, (_m, url: string) => {
    const wrapped = `${origin}/api/nurturing/track/click?r=${recipientId}&u=${encodeURIComponent(url)}&s=${signClick(recipientId, url)}`;
    return `href="${wrapped}"`;
  });
}
