"use client";

// 成績（元スプレッドシートの「月間蓄積データ」）。
//
// 指標を縦、月×担当者を横に並べる。元シートと同じ形。
// 違うのは、書き写した値ではなく案件データから毎回計算し直している点。
// 元シートは月ごとに手で書き写していたため、「全体」が各人の合計と
// 合わない月がいくつもあった。

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Customer, Deal, Lead } from "@/lib/sales-types";
import {
  METRICS,
  TOTAL_COLUMN,
  buildPerformance,
  formatMetric,
  type Performance,
} from "@/lib/sales-performance";

const ACCENT = "#9e8d70";

export default function PerformancePage() {
  const [perf, setPerf] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMonths, setShowAllMonths] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/sales");
      const text = await res.text();
      let json: { leads: Lead[]; deals: Deal[]; customers: Customer[]; performance?: Performance; error?: string };
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
      setPerf(
        json.performance ??
          buildPerformance({ leads: json.leads ?? [], deals: json.deals ?? [], customers: json.customers ?? [] })
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 月が増え続けるので、既定では直近6ヶ月だけ出す
  const months = useMemo(() => {
    if (!perf) return [];
    return showAllMonths ? perf.months : perf.months.slice(-6);
  }, [perf, showAllMonths]);

  if (loading) {
    return <p className="py-24 text-center text-sm text-neutral-400">読み込んでいます…</p>;
  }
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }
  if (!perf) return null;

  const columnsPerMonth = perf.owners.length + 1;

  return (
    <div className="mx-auto w-full max-w-[110rem] space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">成績</h1>
          <p className="mt-1 text-sm text-neutral-500">営業マンごとの月次実績。アポ獲得管理のデータから計算しています</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {perf.months.length > 6 && (
            <button
              onClick={() => setShowAllMonths((v) => !v)}
              className="rounded-full border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {showAllMonths ? "直近6ヶ月だけ表示" : `全${perf.months.length}ヶ月を表示`}
            </button>
          )}
          <button
            onClick={() => void load()}
            className="rounded-full border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            最新にする
          </button>
        </div>
      </header>

      {/* 累計を先に出す。まず全体像、次に月の推移という順番 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">累計（全期間）</h2>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <table className="w-full border-collapse">
            <thead className="border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 dark:bg-neutral-900">
                  指標
                </th>
                {perf.cumulative.map((c) => (
                  <th
                    key={c.owner}
                    className={`whitespace-nowrap px-4 py-2.5 text-right text-xs font-semibold ${
                      c.owner === TOTAL_COLUMN ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-500"
                    }`}
                  >
                    {c.owner}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {METRICS.map((m) => (
                <tr key={m.key} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                    {m.label}
                  </td>
                  {perf.cumulative.map((c) => (
                    <td
                      key={c.owner}
                      className={`whitespace-nowrap px-4 py-2 text-right text-sm tabular-nums ${
                        c.owner === TOTAL_COLUMN ? "font-semibold" : ""
                      }`}
                    >
                      {formatMetric(c.metrics[m.key], m.format)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 月次。月ごとに担当者列がぶら下がる。元シートと同じ形 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">月間蓄積データ</h2>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-10 border-r border-neutral-100 bg-white px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  指標
                </th>
                {months.map((m) => (
                  <th
                    key={m.month}
                    colSpan={columnsPerMonth}
                    className="border-r border-neutral-100 px-4 py-2 text-center text-xs font-semibold dark:border-neutral-800"
                    style={{ color: ACCENT }}
                  >
                    {m.month.replace("-", "/")}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                {months.flatMap((m) =>
                  m.columns.map((c, i) => (
                    <th
                      key={`${m.month}-${c.owner}`}
                      className={`whitespace-nowrap px-3 py-2 text-right text-[11px] font-medium ${
                        c.owner === TOTAL_COLUMN ? "text-neutral-800 dark:text-neutral-100" : "text-neutral-400"
                      } ${i === m.columns.length - 1 ? "border-r border-neutral-100 dark:border-neutral-800" : ""}`}
                    >
                      {c.owner}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {METRICS.map((metric) => (
                <tr key={metric.key} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-100 bg-white px-4 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                    {metric.label}
                  </td>
                  {months.flatMap((m) =>
                    m.columns.map((c, i) => (
                      <td
                        key={`${m.month}-${c.owner}`}
                        className={`whitespace-nowrap px-3 py-2 text-right text-sm tabular-nums ${
                          c.owner === TOTAL_COLUMN ? "font-semibold" : "text-neutral-500"
                        } ${i === m.columns.length - 1 ? "border-r border-neutral-100 dark:border-neutral-800" : ""}`}
                      >
                        {formatMetric(c.metrics[metric.key], metric.format)}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 何をどう数えているかを書いておく。書かないと数字の解釈が人によって変わる */}
      <section className="rounded-2xl border border-neutral-200 bg-white/90 p-5 text-xs leading-relaxed text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
        <h3 className="mb-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">数え方</h3>
        <dl className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">リード獲得数</dt>
            <dd className="inline"> — その月の登録日で数える</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">提案数</dt>
            <dd className="inline"> — その月の提案日で数える</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">成約数・失注数</dt>
            <dd className="inline"> — その月の受注日・失注日で数える</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">受注/失注比</dt>
            <dd className="inline"> — 失注ゼロの月は成約数をそのまま出す</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">平均商談期間</dt>
            <dd className="inline"> — 提案日から受注日まで。どちらか空の案件は平均に入れない</dd>
          </div>
          <div>
            <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">
              商談中案件数・加重パイプライン・アクティブリード数
            </dt>
            <dd className="inline"> — その月末時点で抱えていた数</dd>
          </div>
        </dl>
        <p className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          加重パイプラインの過去月は、案件の<strong>現在の</strong>受注確度で計算しています。
          当時の確度は記録が残っていないためです。過去にさかのぼるほど高めに出ます。
        </p>
      </section>
    </div>
  );
}
