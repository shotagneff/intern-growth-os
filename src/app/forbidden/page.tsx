// 権限が足りない画面に入ったときに出す案内。
//
// proxy が rewrite して描画するため、URL は元のページ（/leads など）のまま。
// ログイン画面に飛ばす作りにすると、ログイン済みなのに弾かれた理由が伝わらず
// 「壊れている」と受け取られるので、ここで理由を伝えて止める。

import Link from "next/link";
import { PAGE_MAIN, PAGE_INNER, PANEL, MAIN_COLOR } from "@/components/panel";

export default function ForbiddenPage() {
  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <div className={`${PANEL} px-6 py-14 text-center sm:px-10`}>
          <div
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full text-xl"
            style={{ backgroundColor: `${MAIN_COLOR}1a`, color: MAIN_COLOR }}
            aria-hidden
          >
            🔒
          </div>

          <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
            こちらのページは権限が異なるため、確認することができません
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            閲覧には別の権限が必要です。
            <br />
            必要な場合は管理者にご連絡ください。
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: MAIN_COLOR }}
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
