"use client";

// ナーチャリング（メルマガ / MA）。
// アポ獲得で「教育が必要」と判断したリードを送客し、購読者として溜め、メルマガで継続育成する。
// タブ: 購読者 / リスト（セグメント）。配信・計測・シナリオは順次追加。

import { useEffect, useState } from "react";
import { PAGE_MAIN, PAGE_INNER, PANEL, PageHeader } from "@/components/panel";
import { Kpi } from "@/components/table-ui";
import SubscribersTab from "./SubscribersTab";
import ListsTab from "./ListsTab";
import CampaignsTab from "./CampaignsTab";
import ScenariosTab from "./ScenariosTab";

type Summary = {
  subscribers: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  lists: number;
  campaigns: number;
  sentCampaigns: number;
};

type Tab = "subscribers" | "lists" | "campaigns" | "scenarios";

export default function NurturingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<Tab>("subscribers");

  // 子タブから呼ぶKPI再取得。マウント時はeffect内で非同期に読む（setStateの同期呼び出しを避ける）。
  async function loadSummary() {
    const res = await fetch("/api/nurturing/subscribers");
    const data = await res.json().catch(() => ({}));
    if (data.ok) setSummary(data.summary ?? null);
  }

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/nurturing/subscribers");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setSummary(data.summary ?? null);
    })();
  }, []);

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="NURTURING"
          title="ナーチャリング"
          description="アポ獲得で教育が必要と判断したリードを送客し、メルマガで継続育成します。"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Kpi label="購読者" value={String(summary?.subscribers ?? 0)} />
          <Kpi label="購読中" value={String(summary?.active ?? 0)} />
          <Kpi label="配信解除" value={String(summary?.unsubscribed ?? 0)} />
          <Kpi label="バウンス" value={String(summary?.bounced ?? 0)} />
          <Kpi label="リスト" value={String(summary?.lists ?? 0)} />
          <Kpi label="配信済" value={String(summary?.sentCampaigns ?? 0)} />
        </div>

        <div className={PANEL}>
          <div className="mb-4 flex gap-1 border-b border-neutral-100 dark:border-neutral-800">
            <TabButton active={tab === "subscribers"} onClick={() => setTab("subscribers")}>
              購読者
            </TabButton>
            <TabButton active={tab === "lists"} onClick={() => setTab("lists")}>
              リスト
            </TabButton>
            <TabButton active={tab === "campaigns"} onClick={() => setTab("campaigns")}>
              キャンペーン
            </TabButton>
            <TabButton active={tab === "scenarios"} onClick={() => setTab("scenarios")}>
              シナリオ
            </TabButton>
          </div>

          {tab === "subscribers" ? (
            <SubscribersTab onChanged={loadSummary} />
          ) : tab === "lists" ? (
            <ListsTab onChanged={loadSummary} />
          ) : tab === "campaigns" ? (
            <CampaignsTab onChanged={loadSummary} />
          ) : (
            <ScenariosTab onChanged={loadSummary} />
          )}
        </div>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-[#9e8d70] text-neutral-900 dark:text-neutral-50"
          : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}
