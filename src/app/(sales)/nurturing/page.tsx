"use client";

// ナーチャリング（メルマガ / MA）。
// アポ獲得で「教育が必要」と判断したリードを送客し、購読者として溜め、メルマガで継続育成する。
// まずは購読者の一覧・ステータス管理から。配信/計測/シナリオは順次追加。

import { useEffect, useMemo, useState } from "react";
import type { Subscriber } from "@/lib/nurturing-types";
import { SUBSCRIBER_STATUSES } from "@/lib/nurturing-types";
import { PAGE_MAIN, PAGE_INNER, PANEL, PageHeader } from "@/components/panel";
import { TableFrame, TH, TD, CELL_INPUT, Kpi } from "@/components/table-ui";

type Summary = {
  subscribers: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  lists: number;
  campaigns: number;
  sentCampaigns: number;
};

export default function NurturingPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/nurturing/subscribers");
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setSubscribers(data.subscribers ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return subscribers;
    return subscribers.filter((s) =>
      [s.company, s.name, s.email, s.owner]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(k)),
    );
  }, [subscribers, q]);

  async function setStatus(id: number, status: string) {
    setSubscribers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: status as Subscriber["status"] } : s)),
    );
    await fetch("/api/nurturing/subscribers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch: { status } }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("この購読者を削除しますか？")) return;
    await fetch(`/api/nurturing/subscribers?id=${id}`, { method: "DELETE" });
    load();
  }

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">購読者一覧</h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="会社名・氏名・メールで検索"
              className="w-64 max-w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-neutral-400">読み込み中…</p>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">
              まだ購読者がいません。アポ獲得管理のリード行「送客」ボタンから追加できます。
            </p>
          ) : (
            <TableFrame>
              <thead className="border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  {["会社名", "氏名", "メールアドレス", "ステータス", "流入元", "担当", "登録日", ""].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {shown.map((s) => (
                  <tr key={s.id}>
                    <td className={`${TD} font-medium`}>{s.company ?? "—"}</td>
                    <td className={TD}>{s.name ?? "—"}</td>
                    <td className={`${TD} text-neutral-500`}>{s.email}</td>
                    <td className={TD}>
                      <select
                        value={s.status}
                        onChange={(e) => setStatus(s.id, e.target.value)}
                        className={`${CELL_INPUT} cursor-pointer`}
                      >
                        {SUBSCRIBER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`${TD} text-neutral-500`}>{s.source ?? "—"}</td>
                    <td className={`${TD} text-neutral-500`}>{s.owner ?? "—"}</td>
                    <td className={`${TD} tabular-nums text-neutral-400`}>{s.subscribedOn ?? ""}</td>
                    <td className={TD}>
                      <button
                        onClick={() => remove(s.id)}
                        className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableFrame>
          )}
        </div>
      </div>
    </main>
  );
}
