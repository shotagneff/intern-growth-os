"use client";

// キャンペーン（メルマガ）タブ。作成・編集・テスト送信・本送信・削除と、送信結果の集計表示。

import { useEffect, useMemo, useState } from "react";
import type { Campaign, NurturingList } from "@/lib/nurturing-types";
import { rate, isValidEmail } from "@/lib/nurturing-types";
import { TableFrame, TH, TD, Pill, TONE } from "@/components/table-ui";

const STATUS_TONE: Record<string, string> = {
  下書き: "gray",
  予約: "sky",
  送信中: "orange",
  送信済: "violet",
  停止: "red",
};

export default function CampaignsTab({ onChanged }: { onChanged?: () => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<NurturingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [cRes, lRes] = await Promise.all([
        fetch("/api/nurturing/campaigns"),
        fetch("/api/nurturing/lists"),
      ]);
      const c = await cRes.json().catch(() => ({}));
      const l = await lRes.json().catch(() => ({}));
      if (c.ok) setCampaigns(c.campaigns ?? []);
      if (l.ok) setLists(l.lists ?? []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const n = newName.trim();
    if (!n) return;
    setCreating(true);
    try {
      const res = await fetch("/api/nurturing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const data = await res.json().catch(() => ({}));
      setNewName("");
      await load();
      onChanged?.();
      if (data.ok && data.campaign) setEditingId(data.campaign.id);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("このキャンペーンを削除しますか？（配信明細も消えます）")) return;
    await fetch(`/api/nurturing/campaigns?id=${id}`, { method: "DELETE" });
    await load();
    onChanged?.();
  }

  const editing = useMemo(
    () => campaigns.find((c) => c.id === editingId) ?? null,
    [campaigns, editingId],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">キャンペーンを作成</h2>
        <div className="flex flex-wrap items-end gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例）9月号ニュースレター"
            className="w-72 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            onClick={create}
            disabled={creating || !newName.trim()}
            className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? "作成中…" : "作成して編集"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-neutral-400">読み込み中…</p>
      ) : campaigns.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">
          まだキャンペーンがありません。上のフォームから作成してください。
        </p>
      ) : (
        <TableFrame>
          <thead className="border-b border-neutral-100 dark:border-neutral-800">
            <tr>
              {["名前 / 件名", "状態", "対象", "配信", "開封", "クリック", ""].map((h) => (
                <th key={h} className={TH}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {campaigns.map((c) => {
              const listName = c.listId ? lists.find((l) => l.id === c.listId)?.name ?? "リスト" : "全購読者";
              return (
                <tr key={c.id}>
                  <td className={TD}>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-neutral-400">{c.subject ?? "（件名未設定）"}</div>
                  </td>
                  <td className={TD}>
                    <Pill text={c.status} tone={toneClass(c.status)} />
                  </td>
                  <td className={`${TD} text-neutral-500`}>{listName}</td>
                  <td className={`${TD} tabular-nums`}>{c.sentCount}/{c.totalCount}</td>
                  <td className={`${TD} tabular-nums`}>
                    {c.openedCount}
                    <span className="ml-1 text-xs text-neutral-400">({rate(c.openedCount, c.sentCount)}%)</span>
                  </td>
                  <td className={`${TD} tabular-nums`}>
                    {c.clickedCount}
                    <span className="ml-1 text-xs text-neutral-400">({rate(c.clickedCount, c.sentCount)}%)</span>
                  </td>
                  <td className={TD}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(c.id)}
                        className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                      >
                        {c.status === "送信済" ? "詳細" : "編集"}
                      </button>
                      <button
                        onClick={() => remove(c.id)}
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
        <CampaignEditor
          campaign={editing}
          lists={lists}
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

function toneClass(status: string): string {
  const key = STATUS_TONE[status] ?? "gray";
  return (TONE as Record<string, string>)[key];
}

// --- 編集モーダル -----------------------------------------------------------

function CampaignEditor({
  campaign,
  lists,
  onClose,
  onSaved,
}: {
  campaign: Campaign;
  lists: NurturingList[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const readOnly = campaign.status === "送信済" || campaign.status === "送信中";
  const [subject, setSubject] = useState(campaign.subject ?? "");
  const [preheader, setPreheader] = useState(campaign.preheader ?? "");
  const [fromName, setFromName] = useState(campaign.fromName ?? "");
  const [fromEmail, setFromEmail] = useState(campaign.fromEmail ?? "");
  const [replyTo, setReplyTo] = useState(campaign.replyTo ?? "");
  const [bodyHtml, setBodyHtml] = useState(campaign.bodyHtml ?? "");
  const [listId, setListId] = useState<string>(campaign.listId ? String(campaign.listId) : "");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [msg, setMsg] = useState<string>("");

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      await fetch("/api/nurturing/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign.id,
          patch: {
            subject: subject.trim() || null,
            preheader: preheader.trim() || null,
            fromName: fromName.trim() || null,
            fromEmail: fromEmail.trim() || null,
            replyTo: replyTo.trim() || null,
            bodyHtml: bodyHtml || null,
            listId: listId ? Number(listId) : null,
          },
        }),
      });
      setMsg("保存しました");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function testSend() {
    const to = prompt("テスト送信先のメールアドレスを入力してください");
    if (!to) return;
    if (!isValidEmail(to)) {
      setMsg("メールアドレスの形式が正しくありません");
      return;
    }
    setBusy("test");
    setMsg("");
    try {
      await save();
      const res = await fetch("/api/nurturing/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id, testTo: to }),
      });
      const data = await res.json().catch(() => ({}));
      setMsg(data.ok ? `テスト送信しました（${to}）` : `失敗: ${data.error ?? "不明なエラー"}`);
    } finally {
      setBusy("");
    }
  }

  async function realSend() {
    const target = listId ? lists.find((l) => String(l.id) === listId)?.name ?? "リスト" : "全購読者";
    if (!confirm(`「${target}」の購読中の全員に本送信します。よろしいですか？`)) return;
    setBusy("send");
    setMsg("");
    try {
      await save();
      const res = await fetch("/api/nurturing/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setMsg(`送信完了：${data.sent} 通成功 / ${data.failed} 通失敗（対象 ${data.total} 名）`);
        onSaved();
      } else {
        setMsg(`失敗: ${data.error ?? "不明なエラー"}`);
      }
    } finally {
      setBusy("");
    }
  }

  const field = "w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm outline-none focus:border-[#9e8d70] disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{campaign.name}</h3>
          <span className="text-xs text-neutral-400">{campaign.status}</span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          <label className="block text-xs text-neutral-500">
            件名
            <input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`} placeholder="メールの件名" />
          </label>
          <label className="block text-xs text-neutral-500">
            プリヘッダー（受信箱で件名の後に見える一文・任意）
            <input value={preheader} onChange={(e) => setPreheader(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-neutral-500">
              差出人名
              <input value={fromName} onChange={(e) => setFromName(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`} placeholder="SEEKAD" />
            </label>
            <label className="block text-xs text-neutral-500">
              差出人アドレス（未入力なら既定）
              <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`} placeholder="news@..." />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-neutral-500">
              返信先（任意）
              <input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`} />
            </label>
            <label className="block text-xs text-neutral-500">
              配信対象
              <select value={listId} onChange={(e) => setListId(e.target.value)} disabled={readOnly} className={`mt-1 ${field}`}>
                <option value="">全購読者（購読中）</option>
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}（{l.memberCount}名）
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-neutral-500">
            本文（HTML）
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              disabled={readOnly}
              rows={10}
              className={`mt-1 font-mono ${field}`}
              placeholder="<p>こんにちは、{会社名} 様</p>"
            />
          </label>
          <p className="text-xs text-neutral-400">
            ※ 配信停止リンクと List-Unsubscribe は送信時に自動で付与されます。
          </p>
        </div>

        {msg && <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800">{msg}</p>}

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
            閉じる
          </button>
          {!readOnly && (
            <>
              <button onClick={save} disabled={saving} className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-600 dark:hover:bg-neutral-800">
                {saving ? "保存中…" : "保存"}
              </button>
              <button onClick={testSend} disabled={busy !== ""} className="rounded-lg border border-[#9e8d70] px-4 py-1.5 text-sm text-[#7d6f57] hover:bg-[#9e8d70]/10 disabled:opacity-40">
                {busy === "test" ? "送信中…" : "テスト送信"}
              </button>
              <button onClick={realSend} disabled={busy !== ""} className="rounded-lg bg-[#9e8d70] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">
                {busy === "send" ? "送信中…" : "本送信"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
