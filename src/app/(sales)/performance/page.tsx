"use client";

// 成績（元スプレッドシートの「月間蓄積データ」）。
//
// 上から「今月どうだったか」→「誰がどこで落としているか」→「月ごとの推移」
// →「元シートと同じ全指標の表」の順に置く。
// 表だけだと数字を追う手間が大きく、結局見なくなる。
//
// 元シートは月ごとに手で書き写す運用だったため、「全体」が各人の合計と
// 合わない月があった。ここは案件データから毎回計算し直している。

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Customer, Deal, Lead } from "@/lib/sales-types";
import {
  METRICS,
  TOTAL_COLUMN,
  buildPerformance,
  formatMetric,
  type Metrics,
  type Performance,
} from "@/lib/sales-performance";
import { Card, Kpi, TableFrame, TD, TH } from "@/components/table-ui";
import { Funnel, MonthlyChart, ownerColor } from "./Charts";

const ACCENT = "#9e8d70";

/** グラフに出せる指標。割合や平均も選べるが、その場合は積み上げない */
const CHARTABLE = ["total", "wins", "leads", "proposals", "mrr", "closeRate"] as const;

export default function PerformancePage() {
  const [perf, setPerf] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartKey, setChartKey] = useState<string>("total");
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

  const months = useMemo(() => {
    if (!perf) return [];
    return showAllMonths ? perf.months : perf.months.slice(-6);
  }, [perf, showAllMonths]);

  /** 今月と先月。上のカードで前月比を出すのに使う */
  const { thisMonth, lastMonth } = useMemo(() => {
    const all = perf?.months ?? [];
    const pick = (m: (typeof all)[number] | undefined) => m?.columns.find((c) => c.owner === TOTAL_COLUMN)?.metrics;
    return { thisMonth: pick(all[all.length - 1]), lastMonth: pick(all[all.length - 2]) };
  }, [perf]);

  if (loading) return <p className="py-24 text-center text-sm text-neutral-400">読み込んでいます…</p>;
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
  const currentLabel = perf.months.at(-1)?.month.replace("-", "/") ?? "";

  /** 前月からどれだけ動いたか。同じなら何も出さない */
  const delta = (key: keyof Metrics, format: string): string | undefined => {
    if (!thisMonth || !lastMonth) return undefined;
    const d = thisMonth[key] - lastMonth[key];
    if (d === 0) return "前月と同じ";
    return `前月比 ${d > 0 ? "+" : "−"}${formatMetric(Math.abs(d), format)}`;
  };

  return (
    <div className="mx-auto w-full max-w-[110rem] space-y-6 px-6 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">成績</h1>
          <p className="mt-1 text-sm text-neutral-500">
            営業マンごとの実績。アポ獲得管理のデータから毎回計算しています
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          最新にする
        </button>
      </header>

      {/* 今月 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">
          今月（{currentLabel}）
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="成約数" value={`${thisMonth?.wins ?? 0}`} hint={delta("wins", "count")} />
          <Kpi label="受注総額" value={formatMetric(thisMonth?.total ?? 0, "yen")} hint={delta("total", "yen")} />
          <Kpi label="リード獲得数" value={`${thisMonth?.leads ?? 0}`} hint={delta("leads", "count")} />
          <Kpi label="商談中案件数" value={`${thisMonth?.openDeals ?? 0}`} hint="月末時点で決着していない案件" />
          <Kpi
            label="加重パイプライン"
            value={formatMetric(thisMonth?.weightedPipeline ?? 0, "yen")}
            hint="月額 × 受注確度"
          />
        </div>
      </section>

      {/* 営業マンごと */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">営業マンごと（全期間）</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {perf.owners.map((owner) => {
            const m = perf.cumulative.find((c) => c.owner === owner)!.metrics;
            return (
              <div
                key={owner}
                className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80"
              >
                <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ownerColor(owner) }} />
                  <h3 className="text-sm font-semibold">{owner}</h3>
                  <span className="ml-auto text-xs tabular-nums text-neutral-400">
                    成約率 {m.closeRate.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  <Funnel metrics={m} color={ownerColor(owner)} />

                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
                    {(
                      [
                        ["受注総額", m.total, "yen"],
                        ["受注MRR", m.mrr, "yen"],
                        ["商談中", m.openDeals, "count"],
                        ["平均商談期間", m.avgCycle, "days"],
                      ] as const
                    ).map(([label, value, format]) => (
                      <div key={label} className="flex items-baseline justify-between gap-2">
                        <dt className="text-neutral-400">{label}</dt>
                        <dd className="font-semibold tabular-nums">{formatMetric(value, format)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 月ごとの推移 */}
      <Card
        title="月ごとの推移"
        action={
          <div className="flex flex-wrap gap-1">
            {CHARTABLE.map((k) => {
              const m = METRICS.find((x) => x.key === k)!;
              return (
                <button
                  key={k}
                  onClick={() => setChartKey(k)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    chartKey === k
                      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        }
      >
        <MonthlyChart months={months} owners={perf.owners} metricKey={chartKey} />
      </Card>

      {/* 累計 */}
      <Card title="累計（全期間）">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="border-b border-neutral-100 dark:border-neutral-800">
              <tr>
                <th className={TH}>指標</th>
                {perf.cumulative.map((c) => (
                  <th
                    key={c.owner}
                    className={`${TH} text-right ${
                      c.owner === TOTAL_COLUMN ? "text-neutral-800 dark:text-neutral-100" : ""
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
                  <td className={`${TD} text-neutral-600 dark:text-neutral-300`}>{m.label}</td>
                  {perf.cumulative.map((c) => (
                    <td
                      key={c.owner}
                      className={`${TD} text-right tabular-nums ${
                        c.owner === TOTAL_COLUMN ? "font-semibold" : "text-neutral-500"
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
      </Card>

      {/* 月間蓄積データ（元シートと同じ形） */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">月間蓄積データ</h2>
          {perf.months.length > 6 && (
            <button
              onClick={() => setShowAllMonths((v) => !v)}
              className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {showAllMonths ? "直近6ヶ月だけ表示" : `全${perf.months.length}ヶ月を表示`}
            </button>
          )}
        </div>
        <TableFrame>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th
                  rowSpan={2}
                  className={`${TH} sticky left-0 z-10 border-r border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900`}
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
                  <td
                    className={`${TD} sticky left-0 z-10 border-r border-neutral-100 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300`}
                  >
                    {metric.label}
                  </td>
                  {months.flatMap((m) =>
                    m.columns.map((c, i) => (
                      <td
                        key={`${m.month}-${c.owner}`}
                        className={`${TD} text-right tabular-nums ${
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
        </TableFrame>
      </section>

      {/* 何をどう数えているか。書かないと数字の解釈が人によって変わる */}
      <Card title="数え方">
        <dl className="grid gap-x-8 gap-y-2 text-xs leading-relaxed text-neutral-500 sm:grid-cols-2">
          {[
            ["リード獲得数", "その月の登録日で数える"],
            ["提案数", "その月の提案日で数える"],
            ["成約数・失注数", "その月の受注日・失注日で数える"],
            ["受注/失注比", "失注ゼロの月は成約数をそのまま出す"],
            ["平均商談期間", "提案日から受注日まで。どちらか空の案件は平均に入れない"],
            ["商談中案件数・加重パイプライン・アクティブリード数", "その月末時点で抱えていた数"],
          ].map(([term, desc]) => (
            <div key={term}>
              <dt className="inline font-medium text-neutral-700 dark:text-neutral-200">{term}</dt>
              <dd className="inline"> — {desc}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t border-neutral-100 pt-3 text-xs leading-relaxed text-neutral-500 dark:border-neutral-800">
          加重パイプラインの過去月は、案件の<strong>現在の</strong>受注確度で計算しています。
          当時の確度は記録が残っていないためです。過去にさかのぼるほど高めに出ます。
        </p>
      </Card>
    </div>
  );
}
