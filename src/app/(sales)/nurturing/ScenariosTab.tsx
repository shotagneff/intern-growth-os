"use client";

// シナリオ（ステップメール）タブ。
// トリガー（購読者追加 / リスト追加）で購読者を登録し、ステップを順に自動配信する。
// シナリオの作成・有効/停止の切替・削除と、ステップの追加/編集/削除。

import { useEffect, useMemo, useState } from "react";
import type { Automation, AutomationStep, NurturingList } from "@/lib/nurturing-types";
import { AUTOMATION_TRIGGERS } from "@/lib/nurturing-types";
import { TableFrame, TH, TD, Pill, TONE } from "@/components/table-ui";

type AutomationRow = Automation & { stepCount: number; activeEnrollments: number };

export default function ScenariosTab({ onChanged }: { onChanged?: () => void }) {
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [lists, setLists] = useState<NurturingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState<string>("購読者追加");
  const [listId, setListId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [aRes, lRes] = await Promise.all([
        fetch("/api/nurturing/automations"),
        fetch("/api/nurturing/lists"),
      ]);
      const a = await aRes.json().catch(() => ({}));
      const l = await lRes.json().catch(() => ({}));
      if (a.ok) setRows(a.automations ?? []);
      if (l.ok) setLists(l.lists ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const n = name.trim();
    if (!n) return;
    if (trigger === "リスト追加" && !listId) {
      alert("「リスト追加」トリガーには対象リストを選んでください");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/nurturing/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, trigger, listId: listId ? Number(listId) : null }),
      });
      const data = await res.json().catch(() => ({}));
      setName("");
      setTrigger("購読者追加");
      setListId("");
      await load();
      onChanged?.();
      if (data.ok && data.automation) setEditingId(data.automation.id);
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(a: AutomationRow) {
    const next = a.status === "有効" ? "停止" : "有効";
    if (next === "有効" && a.stepCount === 0) {
      alert("ステップが無いシナリオは有効化できません。先にステップを追加してください。");
      return;
    }
    await fetch("/api/nurturing/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, patch: { status: next } }),
    });
    await load();
    onChanged?.();
  }

  async function remove(id: number) {
    if (!confirm("このシナリオを削除しますか？（進行中の登録も消えます）")) return;
    await fetch(`/api/nurturing/automations?id=${id}`, { method: "DELETE" });
    await load();
    onChanged?.();
  }

  const editing = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">シナリオを作成</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            シナリオ名
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）資料請求フォロー3通"
              className="w-56 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            トリガー（起動条件）
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              className="w-40 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {AUTOMATION_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          {trigger === "リスト追加" && (
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              対象リスト
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-48 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="">選択してください</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={create}
            disabled={creating || !name.trim()}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? "作成中…" : "作成して編集"}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          「購読者追加」= メルマガ登録された全員に開始。「リスト追加」= 選んだリストに追加された人に開始。
        </p>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-neutral-400">読み込み中…</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          まだシナリオがありません。上のフォームから作成してください。
        </p>
      ) : (
        <TableFrame>
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["シナリオ名", "トリガー", "ステップ", "進行中", "状態", ""].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((a) => {
              const listName = a.listId ? lists.find((l) => l.id === a.listId)?.name ?? "リスト" : null;
              return (
                <tr key={a.id}>
                  <td className={`${TD} font-medium`}>{a.name}</td>
                  <td className={`${TD} text-neutral-500`}>
                    {a.trigger}
                    {listName && <span className="ml-1 text-xs text-neutral-400">（{listName}）</span>}
                  </td>
                  <td className={`${TD} tabular-nums`}>{a.stepCount}</td>
                  <td className={`${TD} tabular-nums`}>{a.activeEnrollments}</td>
                  <td className={TD}>
                    <button onClick={() => toggleStatus(a)} title="クリックで有効/停止を切替">
                      <Pill text={a.status} tone={a.status === "有効" ? TONE.sky : TONE.gray} />
                    </button>
                  </td>
                  <td className={TD}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(a.id)}
                        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        ステップ編集
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableFrame>
      )}

      {editing && (
        <StepEditor
          automation={editing}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

// --- ステップ編集モーダル ---------------------------------------------------

function StepEditor({
  automation,
  onClose,
  onSaved,
}: {
  automation: Automation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [steps, setSteps] = useState<AutomationStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nurturing/automations/steps?automationId=${automation.id}`);
      const data = await res.json().catch(() => ({}));
      if (data.ok) setSteps(data.steps ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automation.id]);

  async function addStep() {
    setAdding(true);
    try {
      await fetch("/api/nurturing/automations/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId: automation.id, delayDays: 0, subject: "", bodyHtml: "" }),
      });
      await load();
      onSaved();
    } finally {
      setAdding(false);
    }
  }

  async function saveStep(id: number, patch: Record<string, unknown>) {
    await fetch("/api/nurturing/automations/steps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
  }

  async function removeStep(id: number) {
    if (!confirm("このステップを削除しますか？")) return;
    await fetch(`/api/nurturing/automations/steps?id=${id}`, { method: "DELETE" });
    await load();
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{automation.name}｜ステップ</h3>
          <span className="text-xs text-neutral-400">{automation.trigger} で開始</span>
        </div>
        <p className="mb-3 text-xs text-neutral-400">
          各ステップは「前のステップ（または開始）から○日後」に送られます。0日＝すぐ。
        </p>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-neutral-400">読み込み中…</p>
          ) : steps.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400">
              まだステップがありません。「ステップを追加」で1通目を作りましょう。
            </p>
          ) : (
            steps.map((s, i) => (
              <StepCard key={s.id} step={s} index={i} onSave={saveStep} onRemove={removeStep} />
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={addStep}
            disabled={adding}
            className="rounded-lg border border-[#9e8d70] px-4 py-1.5 text-sm text-[#7d6f57] hover:bg-[#9e8d70]/10 disabled:opacity-40"
          >
            {adding ? "追加中…" : "＋ ステップを追加"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  onSave,
  onRemove,
}: {
  step: AutomationStep;
  index: number;
  onSave: (id: number, patch: Record<string, unknown>) => Promise<void>;
  onRemove: (id: number) => void;
}) {
  const [delayDays, setDelayDays] = useState(String(step.delayDays));
  const [subject, setSubject] = useState(step.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(step.bodyHtml ?? "");
  const [saved, setSaved] = useState(false);

  async function save() {
    await onSave(step.id, {
      delayDays: Number(delayDays) || 0,
      subject: subject.trim() || null,
      bodyHtml: bodyHtml || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const field =
    "w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500">STEP {index + 1}</span>
        <button
          onClick={() => onRemove(step.id)}
          className="rounded-md px-2 py-0.5 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          削除
        </button>
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
        <span>前ステップ/開始から</span>
        <input
          type="number"
          min={0}
          value={delayDays}
          onChange={(e) => setDelayDays(e.target.value)}
          className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-sm tabular-nums dark:border-neutral-700 dark:bg-neutral-800"
        />
        <span>日後に送信</span>
      </div>
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="件名"
        className={`mb-2 ${field}`}
      />
      <textarea
        value={bodyHtml}
        onChange={(e) => setBodyHtml(e.target.value)}
        placeholder="本文（HTML）"
        rows={5}
        className={`font-mono ${field}`}
      />
      <div className="mt-2 flex items-center justify-end gap-2">
        {saved && <span className="text-xs text-emerald-600">保存しました</span>}
        <button
          onClick={save}
          className="rounded-lg border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800"
        >
          保存
        </button>
      </div>
    </div>
  );
}
