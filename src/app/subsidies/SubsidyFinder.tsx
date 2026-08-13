"use client";

// 補助金提案の画面。架電前に相手企業の情報を入れて、使える制度と話し方を出す。
//
// 入力は都道府県だけ必須にしてある。架電前に分かっているのは所在地くらいなので、
// 全部埋めないと動かない作りにすると使われない。埋まっていない項目は
// AI 側が「何を聞き出すべきか」として返す。

import React, { useState } from "react";
import { Card, Panel } from "../leads/ui";
import { PREFECTURES, INDUSTRIES, type Prefecture, type Industry } from "@/data/subsidies";

const MAIN_COLOR = "#9e8d70";

type Recommendation = {
  id: string;
  priority: "A" | "B" | "C";
  headline: string;
  why: string;
  talkScript: string;
  cautions: string[];
  nextAction: string;
};

type Candidate = {
  id: string;
  name: string;
  authority: string;
  category: "補助金" | "助成金";
  url: string;
  deadline: string | null;
  opensAt: string | null;
  deadlineNote: string | null;
  rate: string;
  maxAmount: number | null;
  amountNote: string | null;
  daysLeft: number | null;
  urgency: string;
  fit: string;
};

type Estimate = {
  course: number;
  rateLabel: string;
  limit: number;
  estimated: number | null;
  needsSpecialStatus: boolean;
  notes: string[];
};

type ApiResponse = {
  ledgerUpdatedAt: string;
  candidateCount: number;
  result: {
    summary: string;
    recommendations: Recommendation[];
    notes: string[];
  };
  estimate: Estimate | null;
  candidates?: Candidate[];
};

const PRIORITY_STYLE: Record<Recommendation["priority"], { label: string; className: string }> = {
  A: { label: "今すぐ", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  B: { label: "次点", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  C: { label: "参考", className: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" },
};

function yen(n: number): string {
  if (n >= 100_000_000) return `${n / 100_000_000}億円`;
  if (n >= 10_000) return `${(n / 10_000).toLocaleString()}万円`;
  return `${n.toLocaleString()}円`;
}

export default function SubsidyFinder() {
  const [prefecture, setPrefecture] = useState<Prefecture>("東京都");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [employees, setEmployees] = useState("");
  const [hourlyWage, setHourlyWage] = useState("");
  const [willRaiseWage, setWillRaiseWage] = useState<"" | "yes" | "no">("");
  const [budget, setBudget] = useState("");
  const [issue, setIssue] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  const candidateById = new Map((data?.candidates ?? []).map((c) => [c.id, c]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/subsidies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefecture,
          industry: industry || undefined,
          employees: employees ? Number(employees) : undefined,
          hourlyWage: hourlyWage ? Number(hourlyWage) : undefined,
          willRaiseWage: willRaiseWage === "" ? undefined : willRaiseWage === "yes",
          budget: budget ? Number(budget) * 10_000 : undefined,
          issue: issue || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "取得に失敗しました");
        return;
      }
      setData(json as ApiResponse);
    } catch {
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-500";
  const labelClass = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-400";

  return (
    <div className="flex flex-col gap-5">
      {/* 入力 */}
      <Card title="相手企業の情報">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="pref">
                都道府県<span className="ml-1 normal-case text-red-500">必須</span>
              </label>
              <select
                id="pref"
                className={inputClass}
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value as Prefecture)}
              >
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="industry">業種</label>
              <select
                id="industry"
                className={inputClass}
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry | "")}
              >
                <option value="">未確認</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="employees">従業員数</label>
              <input
                id="employees"
                type="number"
                min="0"
                className={inputClass}
                placeholder="例: 25"
                value={employees}
                onChange={(e) => setEmployees(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="wage">事業場内最低賃金（時給）</label>
              <input
                id="wage"
                type="number"
                min="0"
                className={inputClass}
                placeholder="例: 1050"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                1,050円未満なら業務改善助成金の助成率が4/5になる
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="raise">賃上げの意向</label>
              <select
                id="raise"
                className={inputClass}
                value={willRaiseWage}
                onChange={(e) => setWillRaiseWage(e.target.value as "" | "yes" | "no")}
              >
                <option value="">未確認</option>
                <option value="yes">前向き</option>
                <option value="no">予定なし</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="budget">想定投資額（万円）</label>
              <input
                id="budget"
                type="number"
                min="0"
                className={inputClass}
                placeholder="例: 300"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="issue">聞き出した課題</label>
            <textarea
              id="issue"
              rows={2}
              className={inputClass}
              placeholder="例: 受発注が全部FAXと電話。担当者が辞めると回らなくなる"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: MAIN_COLOR }}
            >
              {loading ? "調べています…" : "使える制度を出す"}
            </button>
            <p className="text-xs text-neutral-400">都道府県だけでも動きます</p>
          </div>
        </form>
      </Card>

      {error && (
        <Panel className="border-red-200 bg-red-50/80 p-5 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </Panel>
      )}

      {loading && (
        <Panel className="p-8">
          <p className="text-center text-sm text-neutral-400">
            台帳から候補を絞り込んで、提案を組み立てています…
          </p>
        </Panel>
      )}

      {data && (
        <>
          <Card
            title="打ち手"
            action={
              <span className="text-[11px] text-neutral-400">
                候補 {data.candidateCount} 件／台帳 {data.ledgerUpdatedAt} 時点
              </span>
            }
          >
            <p className="text-sm leading-relaxed">{data.result.summary}</p>
          </Card>

          {data.estimate && (
            <Card title="業務改善助成金の試算">
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-neutral-400">助成率</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{data.estimate.rateLabel}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-neutral-400">上限額</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{yen(data.estimate.limit)}</p>
                </div>
                {data.estimate.estimated !== null && (
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.1em] text-neutral-400">支給見込み</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {yen(data.estimate.estimated)}
                    </p>
                  </div>
                )}
              </div>
              {data.estimate.notes.length > 0 && (
                <ul className="mt-4 flex flex-col gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  {data.estimate.notes.map((n, i) => (
                    <li key={i} className="text-xs text-neutral-500">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {data.result.recommendations.map((rec) => {
            const c = candidateById.get(rec.id);
            const style = PRIORITY_STYLE[rec.priority];
            return (
              <Panel key={rec.id} className="p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>
                        {style.label}
                      </span>
                      <h3 className="text-base font-semibold">{c?.name ?? rec.id}</h3>
                      {c && (
                        <span className="text-[11px] text-neutral-400">
                          {c.authority}／{c.category}
                        </span>
                      )}
                    </div>
                    {c && (
                      <div className="flex items-center gap-3 text-xs tabular-nums text-neutral-500">
                        {c.daysLeft !== null && c.daysLeft >= 0 && <span>残り{c.daysLeft}日</span>}
                        {c.deadline && <span>締切 {c.deadline}</span>}
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2"
                          style={{ color: MAIN_COLOR }}
                        >
                          公式ページ
                        </a>
                      </div>
                    )}
                  </div>

                  <p className="text-sm font-medium">{rec.headline}</p>

                  {c && (
                    <div className="flex flex-wrap gap-2 text-[11px] tabular-nums text-neutral-500">
                      <span className="rounded border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
                        {c.rate}
                      </span>
                      {c.maxAmount !== null && (
                        <span className="rounded border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
                          上限 {yen(c.maxAmount)}
                        </span>
                      )}
                      {c.opensAt && (
                        <span className="rounded border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
                          {c.opensAt} 公募開始
                        </span>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
                      なぜこの会社に合うか
                    </p>
                    <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">{rec.why}</p>
                  </div>

                  <div className="rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                    <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
                      架電の切り出し
                    </p>
                    <p className="text-sm leading-relaxed">{rec.talkScript}</p>
                  </div>

                  {rec.cautions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
                        先に潰すこと
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {rec.cautions.map((caution, i) => (
                          <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                            <span className="text-neutral-300">・</span>
                            <span>{caution}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <p className="text-sm">
                      <span className="text-[11px] uppercase tracking-[0.1em] text-neutral-400">次の一手 </span>
                      {rec.nextAction}
                    </p>
                  </div>
                </div>
              </Panel>
            );
          })}

          {data.result.notes.length > 0 && (
            <Card title="申し送り">
              <ul className="flex flex-col gap-2">
                {data.result.notes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                    <span className="text-neutral-300">・</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="px-1 text-xs leading-relaxed text-neutral-400">
            台帳は {data.ledgerUpdatedAt} 時点の情報です。補助金は予算上限に達すると期日前でも締め切られるため、
            架電の直前に公式ページで受付状況を確認してください。金額や要件を顧客に伝える前に、公募要領の原本で裏を取ってください。
          </p>
        </>
      )}
    </div>
  );
}
