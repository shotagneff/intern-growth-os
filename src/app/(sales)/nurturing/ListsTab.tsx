"use client";

// リスト（セグメント）タブ。配信の宛先単位。
// リストの作成・色分け・削除と、購読者の割り当て（モーダルでまとめて追加/除外）。

import { useEffect, useMemo, useState } from "react";
import type { NurturingList, Subscriber } from "@/lib/nurturing-types";
import { TONE, Pill } from "@/components/table-ui";

const COLORS = ["gray", "sky", "orange", "yellow", "violet", "red"] as const;
type ColorKey = (typeof COLORS)[number];

function toneOf(color: string | null): string {
  return color && color in TONE ? (TONE as Record<string, string>)[color] : TONE.gray;
}

export default function ListsTab({ onChanged }: { onChanged?: () => void }) {
  const [lists, setLists] = useState<NurturingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<ColorKey>("gray");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<NurturingList | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/nurturing/lists");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setLists(data.lists ?? []);
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
    setSaving(true);
    try {
      await fetch("/api/nurturing/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, description: description.trim() || null, color }),
      });
      setName("");
      setDescription("");
      setColor("gray");
      await load();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("このリストを削除しますか？（購読者自体は消えません）")) return;
    await fetch(`/api/nurturing/lists?id=${id}`, { method: "DELETE" });
    await load();
    onChanged?.();
  }

  return (
    <div className="space-y-5">
      {/* 作成フォーム */}
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">リストを作成</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            リスト名
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例）夏の展示会リード"
              className="w-56 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            説明（任意）
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="どんな層か"
              className="w-64 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            色
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  className={`h-6 w-6 rounded-full ring-2 ring-inset ${(TONE as Record<string, string>)[c]} ${
                    color === c ? "outline outline-2 outline-offset-1 outline-[#9e8d70]" : ""
                  }`}
                />
              ))}
            </div>
          </label>
          <button
            onClick={create}
            disabled={saving || !name.trim()}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? "作成中…" : "作成"}
          </button>
        </div>
      </div>

      {/* リスト一覧 */}
      {loading ? (
        <p className="py-10 text-center text-sm text-neutral-400">読み込み中…</p>
      ) : lists.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          まだリストがありません。上のフォームから作成してください。
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block h-3 w-3 rounded-full ${toneOf(l.color)}`} />
                    <span className="truncate font-medium">{l.name}</span>
                  </div>
                  {l.description && (
                    <p className="mt-1 truncate text-xs text-neutral-500">{l.description}</p>
                  )}
                </div>
                <Pill text={`${l.memberCount} 名`} tone={toneOf(l.color)} />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => setEditing(l)}
                  className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  購読者を割り当て
                </button>
                <button
                  onClick={() => remove(l.id)}
                  className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MemberPicker
          list={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

// --- 購読者割り当てモーダル -------------------------------------------------

function MemberPicker({
  list,
  onClose,
  onSaved,
}: {
  list: NurturingList;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [initial, setInitial] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [subsRes, memRes] = await Promise.all([
          fetch("/api/nurturing/subscribers"),
          fetch(`/api/nurturing/lists/members?listId=${list.id}`),
        ]);
        const subs = await subsRes.json().catch(() => ({}));
        const mem = await memRes.json().catch(() => ({}));
        setSubscribers(subs.subscribers ?? []);
        const ids = new Set<number>((mem.ids ?? []).map((n: number) => Number(n)));
        setSelected(new Set(ids));
        setInitial(new Set(ids));
      } finally {
        setLoading(false);
      }
    })();
  }, [list.id]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return subscribers;
    return subscribers.filter((s) =>
      [s.company, s.name, s.email].filter(Boolean).some((v) => String(v).toLowerCase().includes(k)),
    );
  }, [subscribers, q]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const toAdd = [...selected].filter((id) => !initial.has(id));
      const toRemove = [...initial].filter((id) => !selected.has(id));
      if (toAdd.length) {
        await fetch("/api/nurturing/lists/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId: list.id, subscriberIds: toAdd }),
        });
      }
      for (const id of toRemove) {
        await fetch(`/api/nurturing/lists/members?listId=${list.id}&subscriberId=${id}`, {
          method: "DELETE",
        });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">「{list.name}」に購読者を割り当て</h3>
          <span className="text-xs text-neutral-400">{selected.size} 名選択中</span>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="会社名・氏名・メールで検索"
          className="mb-3 w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-800"
        />
        <div className="flex-1 overflow-y-auto rounded-lg border border-neutral-100 dark:border-neutral-800">
          {loading ? (
            <p className="py-10 text-center text-sm text-neutral-400">読み込み中…</p>
          ) : shown.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">該当する購読者がいません。</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {shown.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 accent-[#9e8d70]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{s.company ?? s.name ?? s.email}</span>
                      <span className="block truncate text-xs text-neutral-400">{s.email}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
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
