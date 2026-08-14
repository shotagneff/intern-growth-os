"use client";

// 反響リードの一覧。
//
// 「いま誰が対応できているか」が一番大事なので、
// 対応状況と担当を日時のすぐ隣に置いている。

import React, { useEffect, useMemo, useState } from "react";
import { LEAD_STATUSES, firstResponseMinutes, type Lead, type LeadStatus } from "@/lib/callforce";

/** +818012345678 → 080-1234-5678 */
function formatPhone(raw: string): string {
  const d = raw.replace(/[^0-9]/g, "").replace(/^81/, "0");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function formatDateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  未対応: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30",
  留守番電話:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  対応中: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  アポ獲得:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  追客中: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  失注: "bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-400 dark:ring-neutral-500/30",
  対象外:
    "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-500 dark:ring-neutral-500/30",
};

const FILTERS = ["すべて", "未対応", "受電デモ", "架電デモ", "広告・Web"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * 電話番号に紐づくメモ。
 *
 * 保存先は電話番号なので、同じ番号から次に着信したときも同じメモが出る。
 * 入力中は手元の値を優先し、離れたタイミングで保存する。
 * 1文字ごとに保存すると、打っている最中に再取得が走って書きかけが消える。
 */
function NoteCell({
  lead,
  onSave,
}: {
  lead: Lead;
  onSave: (phoneNumber: string, note: string) => Promise<void>;
}) {
  const [value, setValue] = useState(lead.contactNote ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 自分が編集していないときだけ、取得し直した値に追従する
  useEffect(() => {
    if (!editing) setValue(lead.contactNote ?? "");
  }, [lead.contactNote, editing]);

  async function commit() {
    setEditing(false);
    if ((lead.contactNote ?? "") === value) return;
    setSaving(true);
    await onSave(lead.phoneNumber, value);
    setSaving(false);
  }

  return (
    <textarea
      value={value}
      rows={1}
      placeholder="メモ"
      onFocus={() => setEditing(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void commit()}
      disabled={saving}
      className={`w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs leading-relaxed transition hover:border-neutral-200 focus:border-[#9e8d70] focus:bg-white focus:outline-none dark:hover:border-neutral-700 dark:focus:bg-neutral-900 ${
        saving ? "opacity-50" : ""
      }`}
    />
  );
}

export function LeadList({
  leads,
  responders,
  loading,
  savingId,
  onPatch,
  onSaveNote,
}: {
  leads: Lead[];
  responders: string[];
  loading: boolean;
  savingId: string | null;
  onPatch: (id: string, patch: { status?: LeadStatus; assignedTo?: string }) => void;
  onSaveNote: (phoneNumber: string, note: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>("すべて");

  const shown = useMemo(() => {
    switch (filter) {
      case "未対応":
        return leads.filter((l) => l.status === "未対応");
      case "受電デモ":
        return leads.filter((l) => l.demoType === "受電デモ");
      case "架電デモ":
        return leads.filter((l) => l.demoType === "架電デモ" || (!l.demoType && l.source === "demo_call"));
      case "広告・Web":
        return leads.filter((l) => l.source === "ad_form" || l.source === "web_estimate");
      default:
        return leads;
    }
  }, [leads, filter]);

  return (
    <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              filter === f
                ? "bg-[#9e8d70] text-white shadow-sm"
                : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-sm tabular-nums text-neutral-400">{shown.length}件</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] text-sm">
          <thead className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-[0.1em] text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3">日時</th>
              <th className="px-4 py-3">対応状況</th>
              <th className="px-4 py-3">担当</th>
              <th className="px-4 py-3">電話番号</th>
              <th className="px-4 py-3 min-w-[14rem]">メモ（番号ごとに引き継ぎ）</th>
              <th className="px-4 py-3">会社名</th>
              <th className="px-4 py-3">種別</th>
              <th className="px-4 py-3">流入元</th>
              <th className="px-4 py-3 text-right">通話</th>
              <th className="px-4 py-3 text-right">初動</th>
              <th className="px-4 py-3">録音</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-neutral-400">
                  読み込んでいます…
                </td>
              </tr>
            )}
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-neutral-400">
                  該当するリードがありません
                </td>
              </tr>
            )}
            {shown.map((lead) => {
              const mins = firstResponseMinutes(lead);
              return (
                <tr
                  key={lead.id}
                  className={`border-t border-neutral-100 transition hover:bg-neutral-50/70 dark:border-neutral-800 dark:hover:bg-neutral-800/40 ${
                    savingId === lead.id ? "opacity-60" : ""
                  }`}
                >
                  <td className="whitespace-nowrap py-3 pl-4 pr-4 tabular-nums text-neutral-600 dark:text-neutral-300">
                    {/* 手が要る行を左端の帯で示す。行数が増えても目に留まる */}
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`h-8 w-1 shrink-0 rounded-full ${
                          lead.status === "未対応"
                            ? "bg-red-400"
                            : lead.status === "留守番電話"
                              ? "bg-violet-400" // かけ直しが要る
                              : lead.status === "アポ獲得"
                                ? "bg-emerald-400"
                                : "bg-transparent"
                        }`}
                      />
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(e) => onPatch(lead.id, { status: e.target.value as LeadStatus })}
                      className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${STATUS_STYLE[lead.status]}`}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.assignedTo}
                      onChange={(e) => onPatch(lead.id, { assignedTo: e.target.value })}
                      className="cursor-pointer rounded-xl border border-neutral-200 bg-white/70 px-2.5 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800/60"
                    >
                      {[lead.assignedTo, ...responders.filter((r) => r !== lead.assignedTo)].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                    <a href={`tel:${lead.phoneNumber}`} className="hover:underline">
                      {formatPhone(lead.phoneNumber)}
                    </a>
                    {lead.callerType && <span className="ml-2 text-xs text-neutral-400">{lead.callerType}</span>}
                    {/* 2回目以降は、引き継いだメモを読む価値がある相手 */}
                    {lead.callCount > 1 && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {lead.callCount}回目
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <NoteCell lead={lead} onSave={onSaveNote} />
                  </td>
                  <td className="max-w-[12rem] truncate px-4 py-3">{lead.companyName ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{lead.demoType ?? "—"}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-neutral-500">{lead.inflow ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-500">
                    {lead.durationSeconds !== null ? `${lead.durationSeconds}秒` : "—"}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
                      mins !== null && mins > 5 ? "text-red-600 dark:text-red-400" : "text-neutral-500"
                    }`}
                  >
                    {mins === null ? "—" : `${mins}分`}
                  </td>
                  <td className="px-4 py-3">
                    {lead.recordingUrl ? (
                      <a
                        href={lead.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#9e8d70] hover:underline"
                      >
                        聞く
                      </a>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
