import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// 録音ファイルを Vercel Blob へ直接アップロードするための、クライアントアップロード用トークン発行。
//
// ファイル本体はブラウザから Blob へ直接送るため、Vercel Functions の 4.5MB 制限を受けない
// （長い商談録音でも上げられる）。DBへの登録はアップロード完了後に別途 /api/sales/recording へ送る。
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["audio/*", "video/*", "application/octet-stream"],
        addRandomSuffix: true,
        maximumSizeInBytes: 500 * 1024 * 1024, // 500MB
      }),
      // 本番の完了webhook。DB登録はクライアント側で行うためここでは何もしない。
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
