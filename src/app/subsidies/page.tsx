// 補助金・助成金の提案。
//
// 架電前に相手企業の情報を入れると、その会社が今使える制度と、
// そのまま読み上げられる切り出しが出る。
//
// 制度の絞り込みは台帳（src/data/subsidies.ts）で機械的に行い、
// AI には「絞り込んだ候補をこの会社にどう提案するか」だけを考えさせている。
// 全部 AI に任せると存在しない制度を作るため。

import SubsidyFinder from "./SubsidyFinder";
import { LEDGER_UPDATED_AT } from "@/data/subsidies";

export const metadata = {
  title: "補助金・助成金 | シークアドシステム",
};

export default function SubsidiesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">補助金・助成金</h1>
          <p className="mt-1 text-sm text-neutral-500">
            相手企業の情報を入れると、今使える制度と架電の切り出しが出ます。
          </p>
        </div>
        <span className="text-xs text-neutral-400">台帳更新 {LEDGER_UPDATED_AT}</span>
      </header>

      <SubsidyFinder />
    </div>
  );
}
