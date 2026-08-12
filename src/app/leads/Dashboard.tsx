"use client";

// 反響リードのダッシュボード。
//
// 見たいのは「いつ来るか」「どこから来るか」「ちゃんと折り返せているか」の3つ。
// 数字を並べるだけでは読み取れないので、量は棒や濃淡で見せる。

import React, { useMemo, useState } from "react";
import {
  byAssignee,
  byCallerType,
  byDemoType,
  byInflow,
  byStatus,
  byWeekdayHour,
  dailySummary,
  durationBuckets,
  responseStats,
  weeklySummary,
  type Breakdown,
  type Lead,
} from "@/lib/callforce";
import { Card, Kpi } from "./ui";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-08-11" → { label: "08/11 (火)", weekend: false } */
function labelWithWeekday(date: string): { label: string; weekend: boolean } {
  // YYYY-MM-DD は UTC 深夜として解釈されるので getUTCDay がその日の曜日になる
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
  return {
    label: `${date.slice(5).replace("-", "/")} (${DAY_LABELS[dow]})`,
    weekend: dow === 0 || dow === 6,
  };
}

export function Dashboard({ leads }: { leads: Lead[] }) {
  const [period, setPeriod] = useState<"日別" | "週次">("日別");

  const daily = useMemo(() => dailySummary(leads, 14), [leads]);
  const weekly = useMemo(() => weeklySummary(leads), [leads]);
  const heat = useMemo(() => byWeekdayHour(leads), [leads]);
  const stats = useMemo(() => responseStats(leads), [leads]);
  const inflows = useMemo(() => byInflow(leads), [leads]);
  const statuses = useMemo(() => byStatus(leads), [leads]);
  const assignees = useMemo(() => byAssignee(leads), [leads]);
  const callerTypes = useMemo(() => byCallerType(leads), [leads]);
  const demoTypes = useMemo(() => byDemoType(leads), [leads]);
  const durations = useMemo(() => durationBuckets(leads), [leads]);

  const 未対応 = statuses.find((s) => s.name === "未対応")?.count ?? 0;
  const アポ = statuses.find((s) => s.name === "アポ獲得")?.count ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="総リード数" value={String(leads.length)} />
        <Kpi label="未対応" value={String(未対応)} tone={未対応 > 0 ? "warn" : "normal"} />
        <Kpi label="アポ獲得" value={String(アポ)} tone={アポ > 0 ? "good" : "normal"} />
        <Kpi
          label="初動の中央値"
          value={stats.median === null ? "—" : `${stats.median}分`}
          hint={stats.sample < 10 ? `記録${stats.sample}件・参考値` : "目標 5分以内"}
          tone={stats.median !== null && stats.median > 5 ? "warn" : "normal"}
        />
        <Kpi
          label="5分以内の割合"
          value={stats.withinFiveRate === null ? "—" : `${stats.withinFiveRate}%`}
          hint={`${stats.withinFive} / ${stats.sample} 件`}
          tone={stats.withinFiveRate !== null && stats.withinFiveRate < 50 ? "warn" : "normal"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card
          title="件数の推移"
          action={
            <div className="flex gap-1 rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-800">
              {(["日別", "週次"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    period === p
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <TrendTable
            rows={
              period === "日別"
                ? daily.map((d) => ({ key: d.date, ...labelWithWeekday(d.date), ...d }))
                : weekly.map((w) => ({
                    key: w.weekStart,
                    label: `${w.weekStart.slice(5).replace("-", "/")}(月) 〜`,
                    ...w,
                  }))
            }
          />
        </Card>

        <Card title="曜日 × 時間帯" action={<span className="text-xs text-neutral-400">濃いほど多い</span>}>
          <HeatGrid heat={heat} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="流入元">
          <BarList rows={inflows} showRate />
        </Card>
        <Card title="対応状況">
          <BarList rows={statuses} />
        </Card>
        <Card title="担当者">
          <BarList rows={assignees} showRate />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card title="デモの種別">
          <BarList rows={demoTypes} showRate />
        </Card>
        <Card title="発信者区分">
          <BarList rows={callerTypes} />
        </Card>
        <Card
          title="通話の長さ"
          action={<span className="text-xs text-neutral-400">短いほど途中で切られている</span>}
        >
          <BarList rows={durations.map((d) => ({ ...d, appointments: 0, responded: 0 }))} />
        </Card>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

type TrendRow = {
  key: string;
  label: string;
  weekend?: boolean;
  total: number;
  responded: number;
  withinFive: number;
  appointments: number;
};

/** 日別・週次の共通表。件数は背景の棒で量を見せる */
function TrendTable({ rows }: { rows: TrendRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] text-sm">
        <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-neutral-400">
          <tr>
            <th className="pb-2 font-medium">期間</th>
            <th className="pb-2 font-medium">件数</th>
            <th className="pb-2 text-right font-medium">架電済み</th>
            <th className="pb-2 text-right font-medium">5分以内</th>
            <th className="pb-2 text-right font-medium">アポ</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr
              key={r.key}
              className={`border-t border-neutral-100 dark:border-neutral-800 ${
                r.weekend ? "bg-neutral-50/60 dark:bg-neutral-800/30" : ""
              }`}
            >
              <td
                className={`whitespace-nowrap py-2 pr-3 ${
                  r.weekend ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {r.label}
              </td>
              <td className="py-2 pr-3">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <span
                      className="block h-full rounded-full bg-[#9e8d70]"
                      style={{ width: `${(r.total / max) * 100}%` }}
                    />
                  </span>
                  <span className={r.total === 0 ? "text-neutral-300" : "font-medium"}>{r.total}</span>
                </span>
              </td>
              <td className="py-2 text-right text-neutral-500">{r.responded}</td>
              <td className="py-2 text-right text-neutral-500">{r.withinFive}</td>
              <td
                className={`py-2 text-right ${
                  r.appointments > 0 ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-neutral-500"
                }`}
              >
                {r.appointments}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-400">
                まだデータがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** 曜日 × 時間帯の濃淡。人を張る時間を決めるために使う */
function HeatGrid({ heat }: { heat: ReturnType<typeof byWeekdayHour> }) {
  if (heat.max === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">まだデータがありません</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[26rem] border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="w-6" />
            {heat.hours.map((h) => (
              <th key={h} className="pb-1 text-center font-medium tabular-nums text-neutral-400">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.rows.map((row, dow) => (
            <tr key={dow}>
              <td
                className={`pr-1 text-right ${dow >= 5 ? "text-neutral-300" : "text-neutral-500"}`}
              >
                {WEEKDAYS[dow]}
              </td>
              {row.map((n, i) => (
                <td key={i} className="p-0">
                  <div
                    title={`${WEEKDAYS[dow]}曜 ${heat.hours[i]}時 — ${n}件`}
                    className="flex h-7 items-center justify-center rounded tabular-nums"
                    style={{
                      // 0件は薄いグレー。1件でも入ったら色を付けて存在を示す
                      backgroundColor:
                        n === 0 ? "rgba(120,120,120,0.07)" : `rgba(158,141,112,${0.2 + (n / heat.max) * 0.8})`,
                      color: n / heat.max > 0.55 ? "#fff" : "inherit",
                    }}
                  >
                    {n > 0 ? n : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 内訳の棒。showRate を立てるとアポ率も出す */
function BarList({ rows, showRate = false }: { rows: Breakdown[]; showRate?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-400">まだデータがありません</p>;
  }
  return (
    <ul className="flex flex-col gap-2.5 text-sm">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-neutral-600 dark:text-neutral-300" title={r.name}>
            {r.name}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <span
              className="block h-full rounded-full bg-[#9e8d70]"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </span>
          <span className="w-7 text-right tabular-nums font-medium">{r.count}</span>
          {showRate && (
            <span
              className={`w-14 text-right text-xs tabular-nums ${
                r.appointments > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-300"
              }`}
              title="アポ獲得の件数"
            >
              {r.appointments > 0 ? `アポ${r.appointments}` : "—"}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
