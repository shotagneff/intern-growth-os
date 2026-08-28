"use client";

// 購読者タブ。一覧・検索・ステータス変更・編集・シナリオ適用・削除。
// 変更があれば onChanged() で親のKPIを更新する。

import { useEffect, useMemo, useState } from "react";
import type { Subscriber } from "@/lib/nurturing-types";
import { SUBSCRIBER_STATUSES, todayJst } from "@/lib/nurturing-types";
import { TableFrame, TH, TD, CELL_INPUT } from "@/components/table-ui";

export default function SubscribersTab({ onChanged }: { onChanged?: () => void }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Subscriber | null>(null);
  const [applying, setApplying] = useState<Subscriber | null>(null);

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
          まだ購読者がいません。アポ獲得管理・反響リードの「メルマガ」ボタンから追加できます。
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setApplying(s)}
                      className="rounded-md border border-[#9e8d70] px-2.5 py-1 text-xs text-[#7d6f57] hover:bg-[#9e8d70]/10"
                      title="この購読者にメルマガ（シナリオ）を適用して配信を始める"
                    >
                      メルマガ配信
                    </button>
                    <button
                      onClick={() => setEditing(s)}
                      className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      )}

      {editing && (
        <EditModal
          subscriber={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChanged?.();
          }}
        />
      )}
      {applying && <ApplyScenarioModal subscriber={applying} onClose={() => setApplying(null)} />}
    </div>
  );
}

// --- 購読者の編集（入力ミスの修正など） ------------------------------------

function EditModal({
  subscriber,
  onClose,
  onSaved,
}: {
  subscriber: Subscriber;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [company, setCompany] = useState(subscriber.company ?? "");
  const [name, setName] = useState(subscriber.name ?? "");
  const [email, setEmail] = useState(subscriber.email ?? "");
  const [owner, setOwner] = useState(subscriber.owner ?? "");
  const [note, setNote] = useState(subscriber.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!email.trim()) {
      setErr("メールアドレスは必須です");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/nurturing/subscribers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: subscriber.id,
          patch: {
            company: company.trim() || null,
            name: name.trim() || null,
            email: email.trim(),
            owner: owner.trim() || null,
            note: note.trim() || null,
          },
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) onSaved();
      else setErr(data.error ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-sm font-semibold">購読者を編集</h3>
        <div className="space-y-3">
          <label className="block text-xs text-neutral-500">
            会社名
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-xs text-neutral-500">
            氏名
            <input value={name} onChange={(e) => setName(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-xs text-neutral-500">
            メールアドレス
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-xs text-neutral-500">
            担当
            <input value={owner} onChange={(e) => setOwner(e.target.value)} className={`mt-1 ${field}`} />
          </label>
          <label className="block text-xs text-neutral-500">
            メモ
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={`mt-1 ${field}`} />
          </label>
        </div>
        {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- シナリオ適用（どのメルマガを・いつから） ------------------------------

type ScenarioOption = {
  id: number;
  name: string;
  status: string;
  stepCount: number;
};

function ApplyScenarioModal({ subscriber, onClose }: { subscriber: Subscriber; onClose: () => void }) {
  const [scenarios, setScenarios] = useState<ScenarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [automationId, setAutomationId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(todayJst());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/nurturing/automations");
        const data = await res.json().catch(() => ({}));
        const list: ScenarioOption[] = (data.automations ?? []).filter(
          (a: ScenarioOption) => a.stepCount > 0,
        );
        setScenarios(list);
        if (list.length) setAutomationId(String(list[0].id));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selected = scenarios.find((s) => String(s.id) === automationId) ?? null;

  async function apply() {
    if (!automationId) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/nurturing/automations/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automationId: Number(automationId),
          subscriberId: subscriber.id,
          startDate,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        setMsg(
          selected?.status === "有効"
            ? `「${selected?.name}」を ${startDate} から配信開始する設定にしました。`
            : `登録しました。ただしシナリオが「停止」中のため、配信は有効化後に始まります。`,
        );
      } else {
        setMsg(`失敗: ${data.error ?? "不明なエラー"}`);
      }
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-sm font-semibold">メルマガ（シナリオ）を適用</h3>
        <p className="mb-3 text-xs text-neutral-400">
          {subscriber.company ?? subscriber.name ?? subscriber.email} に、選んだシナリオを指定日から自動配信します。
        </p>

        {loading ? (
          <p className="py-6 text-center text-sm text-neutral-400">読み込み中…</p>
        ) : scenarios.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            適用できるシナリオがありません。「シナリオ」タブでステップ付きのシナリオを作成してください。
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs text-neutral-500">
              シナリオ
              <select
                value={automationId}
                onChange={(e) => setAutomationId(e.target.value)}
                className={`mt-1 ${field}`}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.stepCount}通・{s.status}）
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-neutral-500">
              配信開始日
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`mt-1 ${field}`}
              />
            </label>
            {selected && selected.status !== "有効" && (
              <p className="text-xs text-orange-600">
                ※ このシナリオは「停止」中です。実際の配信は「シナリオ」タブで有効化してから始まります。
              </p>
            )}
          </div>
        )}

        {msg && <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">{msg}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            閉じる
          </button>
          <button
            onClick={apply}
            disabled={busy || !automationId || scenarios.length === 0}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "設定中…" : "配信を開始"}
          </button>
        </div>
      </div>
    </div>
  );
}
