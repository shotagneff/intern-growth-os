// クリック計測（公開）。本文中のリンクをこのURLで包んで（クリックラップ）計測する。
// proxy.ts で認証除外。?r=<recipientId>&u=<encoded url>&s=<sig> を検証し、
// クリックを記録して本来のURLへ302リダイレクトする。
// 署名でオープンリダイレクト悪用を防ぐ（uはhttp/httpsのみ許可）。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { markRecipientClicked } from "@/lib/nurturing";
import { verifyClick } from "@/lib/nurturing-track";

function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    // fallthrough
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rid = Number(searchParams.get("r"));
  const raw = searchParams.get("u") ?? "";
  const sig = searchParams.get("s") ?? "";

  const dest = safeHttpUrl(raw);
  // 署名が正しく、URLも正しいときだけリダイレクトする
  if (!dest || !rid || !verifyClick(rid, raw, sig)) {
    return NextResponse.json({ ok: false, error: "無効なリンクです" }, { status: 400 });
  }
  try {
    await ensureNurturingTables();
    await markRecipientClicked(rid);
  } catch {
    // 計測失敗でもリダイレクトは行う
  }
  return NextResponse.redirect(dest, 302);
}
