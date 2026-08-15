"use client";

// 成績のグラフ部品。
//
// グラフのライブラリは入れない。棒と線だけなので SVG を直接書けば足りる。
// 依存を1つ増やすと、バージョンが上がるたびに見た目が変わる。

import React from "react";
import { METRICS, TOTAL_COLUMN, formatMetric, type Metrics, type PerformanceMonth } from "@/lib/sales-performance";

/**
 * 担当者ごとの色。
 *
 * 赤緑の見分けがつきにくい人でも区別できる組み合わせを選んでいる。
 * 明度が3段に分かれているので、色が分からなくても濃さで読める。
 */
export const OWNER_COLORS: Record<string, string> = {
  平賀翔大: "#9e8d70",
  佐藤翔永: "#1d6f80",
  宅間宗大: "#94532f",
};
export const OTHER_COLOR = "#a1a1aa";

export function ownerColor(owner: string): string {
  return OWNER_COLORS[owner] ?? OTHER_COLOR;
}

// ---------------------------------------------------------------------------
// ファネル
// ---------------------------------------------------------------------------

/**
 * リード → 提案 → 成約。
 *
 * 数字を並べるだけだと、どこで落ちているかが読み取れない。
 * 横幅で見せると「提案まで行かない」のか「提案してから決まらない」のかが一目で分かる。
 */
export function Funnel({ metrics, color }: { metrics: Metrics; color: string }) {
  const steps = [
    { label: "リード", value: metrics.leads },
    { label: "提案", value: metrics.proposals, rate: metrics.cvrProposal },
    { label: "成約", value: metrics.wins, rate: metrics.cvrWin },
  ];
  const max = Math.max(1, metrics.leads);

  return (
    <div className="space-y-1.5">
      {steps.map((s, i) => (
        <div key={s.label}>
          {i > 0 && (
            <p className="mb-1 pl-[4.5rem] text-[10px] tabular-nums text-neutral-400">
              ↓ {s.rate!.toFixed(1)}%
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="w-[4.5rem] shrink-0 text-[11px] text-neutral-500">{s.label}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-md transition-[width] duration-500"
                style={{
                  width: `${(s.value / max) * 100}%`,
                  backgroundColor: color,
                  // 段が進むほど薄くする。同じ色でも段の違いが分かる
                  opacity: 1 - i * 0.22,
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{s.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 月次の積み上げ棒
// ---------------------------------------------------------------------------

/** 金額は桁が大きいので、軸は万・億で丸めて出す */
function axisLabel(v: number, format: string): string {
  if (format !== "yen") return String(Math.round(v));
  if (v === 0) return "0";
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(1)}億`;
  if (v >= 10_000) return `${Math.round(v / 10_000)}万`;
  return String(Math.round(v));
}

export function MonthlyChart({
  months,
  owners,
  metricKey,
}: {
  months: PerformanceMonth[];
  owners: string[];
  metricKey: string;
}) {
  const metric = METRICS.find((m) => m.key === metricKey)!;
  // 割合や平均は積み上げても意味がないので、その場合は全体の値だけを1本で出す
  const stackable = metric.format === "count" || metric.format === "yen";

  const series = months.map((m) => ({
    month: m.month,
    parts: owners.map((o) => ({
      owner: o,
      value: m.columns.find((c) => c.owner === o)?.metrics[metric.key] ?? 0,
    })),
    total: m.columns.find((c) => c.owner === TOTAL_COLUMN)?.metrics[metric.key] ?? 0,
  }));

  const max = Math.max(1, ...series.map((s) => s.total));
  const H = 168;
  const ticks = [0, 0.5, 1].map((t) => t * max);

  if (!series.length) {
    return <p className="py-10 text-center text-sm text-neutral-400">まだデータがありません</p>;
  }

  return (
    <div>
      <div className="flex gap-3">
        {/* 目盛り */}
        <div className="flex w-12 shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-neutral-400" style={{ height: H }}>
          {[...ticks].reverse().map((t, i) => (
            <span key={i}>{axisLabel(t, metric.format)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: H }}>
            {/* 横線。値を読むための当たり */}
            {ticks.map((t, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-dashed border-neutral-200 dark:border-neutral-800"
                style={{ bottom: `${(t / max) * 100}%` }}
              />
            ))}
            <div className="absolute inset-0 flex items-end gap-2">
              {series.map((s) => (
                <div key={s.month} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[10px] text-white group-hover:block dark:bg-neutral-100 dark:text-neutral-900">
                    {s.month.replace("-", "/")}　{formatMetric(s.total, metric.format)}
                  </div>
                  <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-md">
                    {stackable ? (
                      s.parts.map((p) => (
                        <div
                          key={p.owner}
                          style={{
                            height: `${(p.value / max) * H}px`,
                            backgroundColor: ownerColor(p.owner),
                          }}
                          title={`${p.owner} ${formatMetric(p.value, metric.format)}`}
                        />
                      ))
                    ) : (
                      <div style={{ height: `${(s.total / max) * H}px`, backgroundColor: "#9e8d70" }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 月 */}
          <div className="mt-1.5 flex gap-2">
            {series.map((s) => (
              <span key={s.month} className="flex-1 text-center text-[10px] tabular-nums text-neutral-400">
                {s.month.slice(5)}月
              </span>
            ))}
          </div>
        </div>
      </div>

      {stackable && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-14">
          {owners.map((o) => (
            <span key={o} className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ownerColor(o) }} />
              {o}
            </span>
          ))}
        </div>
      )}
      {!stackable && (
        <p className="mt-3 pl-14 text-[11px] text-neutral-400">
          割合・平均は足し合わせても意味がないため、全体の値だけを出しています
        </p>
      )}
    </div>
  );
}
