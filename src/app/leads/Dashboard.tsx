"use client";

// 反響リードのダッシュボード。
//
// 見たいのは「いつ来るか」「どこから来るか」「ちゃんと折り返せているか」の3つ。
// 数字を並べるだけでは読み取れないので、量は棒や濃淡で見せる。

import React, { useMemo, useState } from "react";
import {
  appointmentsByChannel,
  byAssignee,
  byCallerType,
  byDemoType,
  byInflow,
  byStatus,
  byWeekdayHour,
  daysUntil,
  dailyTrend,
  durationBuckets,
  responseStats,
  uniqueAppointmentLeads,
  weeklyTrend,
  type Breakdown,
  type Lead,
} from "@/lib/callforce";
import { Card, Kpi } from "./ui";
import { TrendChart } from "./TrendChart";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export function Dashboard({ leads }: { leads: Lead[] }) {
  const [period, setPeriod] = useState<"日別" | "週次">("日別");

  const dailyPoints = useMemo(() => dailyTrend(leads, 14), [leads]);
  const weeklyPoints = useMemo(() => weeklyTrend(leads), [leads]);
  const heat = useMemo(() => byWeekdayHour(leads), [leads]);
  const stats = useMemo(() => responseStats(leads), [leads]);
  const inflows = useMemo(() => byInflow(leads), [leads]);
  const wonByChannel = useMemo(() => appointmentsByChannel(leads), [leads]);
  const statuses = useMemo(() => byStatus(leads), [leads]);
  const assignees = useMemo(() => byAssignee(leads), [leads]);
  const callerTypes = useMemo(() => byCallerType(leads), [leads]);
  const demoTypes = useMemo(() => byDemoType(leads), [leads]);
  const durations = useMemo(() => durationBuckets(leads), [leads]);

  const 未対応 = statuses.find((s) => s.name === "未対応")?.count ?? 0;

  // 追客の期日。0以下＝今日やるもの、マイナス＝過ぎているもの。
  // 未対応と違ってアラートを出さないので、ここに出さないと誰も気づかない。
  const 本日の追客 = useMemo(
    () => leads.filter((l) => { const d = daysUntil(l.nextActionAt); return d !== null && d <= 0; }).length,
    [leads]
  );
  const 期日超過 = useMemo(
    () => leads.filter((l) => { const d = daysUntil(l.nextActionAt); return d !== null && d < 0; }).length,
    [leads]
  );
  // アポ獲得は電話番号ごとに1件で数える（同じ番号の重複問い合わせで水増ししない）
  const アポ = useMemo(() => uniqueAppointmentLeads(leads).length, [leads]);

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Kpi label="総リード数" value={String(leads.length)} />
        <Kpi label="未対応" value={String(未対応)} tone={未対応 > 0 ? "warn" : "normal"} />
        <Kpi
          label="本日の追客"
          value={String(本日の追客)}
          hint={期日超過 > 0 ? `うち ${期日超過}件が期日超過` : undefined}
          tone={期日超過 > 0 ? "warn" : "normal"}
        />
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

      {/* 推移は横に長いほど読みやすいので、1枚で幅を使い切る */}
      <section>
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
          <TrendChart points={period === "日別" ? dailyPoints : weeklyPoints} />
        </Card>
      </section>

      <section>
        <Card title="曜日 × 時間帯" action={<span className="text-xs text-neutral-400">濃いほど多い</span>}>
          <HeatGrid heat={heat} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card
          title="流入経路別のアポ獲得"
          action={<span className="text-xs text-neutral-400">アポ獲得時のみ記録</span>}
        >
          <BarList rows={wonByChannel} />
        </Card>
        <Card title="流入元">
          <BarList rows={inflows} showRate />
        </Card>
        <Card title="対応状況">
          <BarList rows={statuses} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Card title="担当者">
          <BarList rows={assignees} showRate />
        </Card>
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
                r.appointments > 0 ? "text-yellow-700 dark:text-yellow-300" : "text-neutral-300"
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
