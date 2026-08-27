// 開封計測（公開）。メール本文に埋めた 1x1 画像から呼ばれる。
// proxy.ts で認証除外。?r=<recipientId>&s=<sig> を検証し、開封を記録して透明GIFを返す。

import { NextRequest, NextResponse } from "next/server";
import { ensureNurturingTables } from "@/lib/schema";
import { markRecipientOpened } from "@/lib/nurturing";
import { verifyOpen } from "@/lib/nurturing-track";

// 1x1 透明GIF
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixel(): NextResponse {
  return new NextResponse(new Uint8Array(GIF), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rid = Number(searchParams.get("r"));
  const sig = searchParams.get("s") ?? "";
  if (rid && verifyOpen(rid, sig)) {
    try {
      await ensureNurturingTables();
      await markRecipientOpened(rid);
    } catch {
      // 計測失敗は無視（画像は必ず返す）
    }
  }
  return pixel();
}
