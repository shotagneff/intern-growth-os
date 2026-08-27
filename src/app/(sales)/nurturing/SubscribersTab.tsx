"use client";

// 購読者タブ。一覧・検索・ステータス変更・削除。
// 変更があれば onChanged() で親のKPIを更新する。

import { useEffect, useMemo, useState } from "react";
import type { Subscriber } from "@/lib/nurturing-types";
import { SUBSCRIBER_STATUSES } from "@/lib/nurturing-types";
import { TableFrame, TH, TD, CELL_INPUT } from "@/components/table-ui";

export default function SubscribersTab({ onChanged }: { onChanged?: () => void }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/nurturing/subscribers");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setSubscribers(data.subscribers ?? []);
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
    onChanged?.();
  }

  async function remove(id: number) {
    if (!confirm("この購読者を削除しますか？")) return;
    await fetch(`/api/nurturing/subscribers?id=${id}`, { method: "DELETE" });
    load();
    onChanged?.();
  }

  return (
    <div>
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
  );
}
