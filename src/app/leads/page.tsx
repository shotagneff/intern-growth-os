"use client";

// 反響リード管理。
//
// Callforce に入ったデモ通話・広告フォームを一覧し、
// 担当者と対応状況をその場で変えられるようにする。
//
// データは Callforce 側の Supabase にあり、ここでは複製しない。
// 複製すると「どちらが正か」が曖昧になり、LINE通知の対応済み判定とズレる。

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LEAD_STATUSES,
  byInflow,
  firstResponseMinutes,
  weeklySummary,
  type Lead,
  type LeadStatus,
} from "@/lib/callforce";

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
  対応中: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  アポ獲得: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  追客中: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  失注: "bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-400 dark:ring-neutral-500/30",
  対象外: "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-500/10 dark:text-neutral-500 dark:ring-neutral-500/30",
};

export default function LeadsAdminPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [responders, setResponders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"すべて" | "未対応" | "受電デモ" | "架電デモ" | "広告・Web">("すべて");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      // JSON 以外が返ることがある。ブラウザに古い画面が残っていて
      // 移動前のURLを叩くと404のHTMLが返り、そのまま JSON.parse すると
      // 「Unexpected token '<'」という原因の分からない文言になる。
      const text = await res.text();
      let json: { leads?: Lead[]; responders?: string[]; error?: string };
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          res.status === 404
            ? "画面が古くなっています。ページを再読み込みしてください（⌘+Shift+R）"
            : `サーバーから予期しない応答が返りました (${res.status})`
        );
      }
      if (!res.ok) throw new Error(json?.error ?? `取得に失敗しました (${res.status})`);
      setLeads(json.leads ?? []);
      setResponders(json.responders ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // 20秒ごとに取り直す。5分以内に架電するのが目標なので、
    // 1分待たせると持ち時間の2割を気づくまでに使ってしまう。
    // 「最新にする」ボタンは、それを待たずに今すぐ見たいときのため。
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  /** 画面上だけ先に変えて、裏で保存する。待たされる感じをなくす */
  async function patch(id: string, patchBody: { status?: LeadStatus; assignedTo?: string }) {
    const before = leads;
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, ...(patchBody.status ? { status: patchBody.status } : {}), ...(patchBody.assignedTo ? { assignedTo: patchBody.assignedTo } : {}) }
          : l
      )
    );
    setSaving(id);
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patchBody }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
    } catch (e) {
      setLeads(before); // 戻す。保存できていないのに変わって見えるのが一番困る
      setError((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

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

  const weekly = useMemo(() => weeklySummary(leads), [leads]);
  const inflows = useMemo(() => byInflow(leads).slice(0, 8), [leads]);

  const kpi = useMemo(() => {
    const total = leads.length;
    const 未対応 = leads.filter((l) => l.status === "未対応").length;
    const アポ = leads.filter((l) => l.status === "アポ獲得").length;
    const times = leads.map(firstResponseMinutes).filter((m): m is number => m !== null);
    const 中央値 =
      times.length === 0
        ? null
        : [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
    return { total, 未対応, アポ, 中央値 };
  }, [leads]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">反響リード</h1>
          <p className="mt-1 text-sm text-neutral-500">
            デモ通話・広告フォームから入ったリード。5分以内の折り返しが目標です。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">20秒ごとに自動更新</span>
          <button
            onClick={() => void load()}
            className="rounded-2xl border border-neutral-200 bg-white/90 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/80 dark:hover:bg-neutral-800"
          >
            最新にする
          </button>
        </div>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="総リード数" value={String(kpi.total)} />
        <Kpi label="未対応" value={String(kpi.未対応)} tone={kpi.未対応 > 0 ? "warn" : "normal"} />
        <Kpi label="アポ獲得" value={String(kpi.アポ)} tone={kpi.アポ > 0 ? "good" : "normal"} />
        <Kpi
          label="初動の中央値"
          value={kpi.中央値 === null ? "—" : `${kpi.中央値}分`}
          hint="目標 5分以内"
          tone={kpi.中央値 !== null && kpi.中央値 > 5 ? "warn" : "normal"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card title="週次">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="pb-2">週（月曜〜）</th>
                  <th className="pb-2 text-right">件数</th>
                  <th className="pb-2 text-right">架電済み</th>
                  <th className="pb-2 text-right">5分以内</th>
                  <th className="pb-2 text-right">アポ</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {weekly.map((w) => (
                  <tr key={w.weekStart} className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="py-2">{w.weekStart}</td>
                    <td className="py-2 text-right">{w.total}</td>
                    <td className="py-2 text-right">{w.responded}</td>
                    <td className="py-2 text-right">{w.withinFive}</td>
                    <td className="py-2 text-right">{w.appointments}</td>
                  </tr>
                ))}
                {weekly.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-neutral-400">
                      まだデータがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="流入元">
          <ul className="flex flex-col gap-2 text-sm">
            {inflows.map((i) => (
              <li key={i.name} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-neutral-600 dark:text-neutral-300">{i.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <span
                    className="block h-full rounded-full bg-[#9e8d70]"
                    style={{ width: `${(i.count / (inflows[0]?.count || 1)) * 100}%` }}
                  />
                </span>
                <span className="w-8 text-right tabular-nums text-neutral-500">{i.count}</span>
              </li>
            ))}
            {inflows.length === 0 && <li className="py-6 text-center text-neutral-400">まだデータがありません</li>}
          </ul>
        </Card>
      </section>

      <section className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
          {(["すべて", "未対応", "受電デモ", "架電デモ", "広告・Web"] as const).map((f) => (
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
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">流入元</th>
                <th className="px-4 py-3">電話番号</th>
                <th className="px-4 py-3">会社名</th>
                <th className="px-4 py-3 text-right">通話</th>
                <th className="px-4 py-3 text-right">初動</th>
                <th className="px-4 py-3">担当</th>
                <th className="px-4 py-3">対応状況</th>
                <th className="px-4 py-3">録音</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-neutral-400">
                    読み込んでいます…
                  </td>
                </tr>
              )}
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-neutral-400">
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
                      saving === lead.id ? "opacity-60" : ""
                    }`}
                  >
                    <td className="whitespace-nowrap py-3 pl-4 pr-4 tabular-nums text-neutral-600 dark:text-neutral-300">
                      {/* 未対応は左端の帯で示す。行数が増えても目に留まる */}
                      <span className="flex items-center gap-2.5">
                        <span
                          className={`h-8 w-1 shrink-0 rounded-full ${
                            lead.status === "未対応"
                              ? "bg-red-400"
                              : lead.status === "アポ獲得"
                                ? "bg-emerald-400"
                                : "bg-transparent"
                          }`}
                        />
                        {formatDateTime(lead.createdAt)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-500">{lead.demoType ?? "—"}</td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-neutral-500">{lead.inflow ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium tabular-nums">
                      <a href={`tel:${lead.phoneNumber}`} className="hover:underline">
                        {formatPhone(lead.phoneNumber)}
                      </a>
                      {lead.callerType && (
                        <span className="ml-2 text-xs text-neutral-400">{lead.callerType}</span>
                      )}
                    </td>
                    <td className="max-w-[12rem] truncate px-4 py-3">{lead.companyName ?? "—"}</td>
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
                      <select
                        value={lead.assignedTo}
                        onChange={(e) => void patch(lead.id, { assignedTo: e.target.value })}
                        className="rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
                      >
                        {[lead.assignedTo, ...responders.filter((r) => r !== lead.assignedTo)].map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={lead.status}
                        onChange={(e) => void patch(lead.id, { status: e.target.value as LeadStatus })}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${STATUS_STYLE[lead.status]}`}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
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
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "warn" | "good";
}) {
  const accent =
    tone === "warn"
      ? "text-red-600 dark:text-red-400"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
