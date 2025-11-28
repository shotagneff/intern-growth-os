"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

const MAIN_COLOR = "#9e8d70";

type MoodOption = "最高！" | "いい感じ" | "普通" | "少し疲れた" | "しんどい…" | "";

type StoredMember = {
  id: string;
  name: string;
  team?: string;
  role?: string;
  iconUrl?: string;
  active: boolean;
};

const MEMBER_STORAGE_KEY = "igos_members_v1";
const FALLBACK_MEMBERS: StoredMember[] = [
  {
    id: "hiraga",
    name: "平賀　翔大",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_hiraga.jpg",
    active: true,
  },
  {
    id: "takuma",
    name: "宅間　宗大",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_takuma.jpg",
    active: true,
  },
  {
    id: "sato",
    name: "佐藤　翔永",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_sato.png",
    active: true,
  },
];

type DailyReport = {
  id: string;
  createdAt: string;
  dateLabel: string;
  endTime: string;
  memberName: string;
  output: string;
  snapshot: string;
  success: string;
  improvement: string;
  praise: string;
  mood: MoodOption;
  moodNote: string;
};

export default function DailyReportsPage() {
  const [memberName, setMemberName] = useState<string>("");
  const [endTime, setEndTime] = useState("");
  const [output, setOutput] = useState("");
  const [snapshot, setSnapshot] = useState("");
  const [success, setSuccess] = useState("");
  const [improvement, setImprovement] = useState("");
  const [praise, setPraise] = useState("");
  const [mood, setMood] = useState<MoodOption>("");
  const [moodNote, setMoodNote] = useState<string>("");
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [copyMessage, setCopyMessage] = useState<string>("");
  const [availableMembers, setAvailableMembers] = useState<StoredMember[]>(FALLBACK_MEMBERS);

  const todayLabel = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}/${mm}/${dd}`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // メンバー一覧の読み込み
    try {
      const rawMembers = window.localStorage.getItem(MEMBER_STORAGE_KEY);
      if (rawMembers) {
        const parsed = JSON.parse(rawMembers) as StoredMember[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAvailableMembers(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load members from localStorage", e);
    }

    // 選択済みメンバー名の復元
    const storedName = window.localStorage.getItem("igos_member_name");
    if (storedName) {
      setMemberName(storedName);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("igos_daily_reports_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as DailyReport[];
      if (Array.isArray(parsed)) {
        setReports(parsed);
      }
    } catch (e) {
      console.error("Failed to load daily reports from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const serialized = JSON.stringify(reports);
      window.localStorage.setItem("igos_daily_reports_v1", serialized);
    } catch (e) {
      console.error("Failed to save daily reports to localStorage", e);
    }
  }, [reports]);

  const handleSave = () => {
    const trimmedName = memberName.trim();
    const trimmedOutput = output.trim();
    if (!trimmedName) {
      alert("まずは画面上部で『メンバー名』を入力してください。");
      return;
    }
    if (!trimmedOutput) {
      alert("まずは『今日のアウトプット』を一言で良いので記入してください。");
      return;
    }

    const newReport: DailyReport = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      dateLabel: todayLabel,
      endTime: endTime.trim(),
      memberName: trimmedName,
      output: trimmedOutput,
      snapshot: snapshot.trim(),
      success: success.trim(),
      improvement: improvement.trim(),
      praise: praise.trim(),
      mood,
      moodNote: moodNote.trim(),
    };

    setReports((prev) => [newReport, ...prev]);

    setEndTime("");
    setOutput("");
    setSnapshot("");
    setSuccess("");
    setImprovement("");
    setPraise("");
    setMood("");
    setMoodNote("");
  };

  const buildShareText = (report: DailyReport): string => {
    const lines: string[] = [];
    lines.push(`【今日の日報】${report.dateLabel} ${report.memberName || ""}`.trim());
    if (report.endTime) {
      lines.push(`終了時刻: ${report.endTime}`);
    }
    lines.push("");
    lines.push("■① 今日のアウトプット");
    lines.push(report.output || "―");
    lines.push("");
    lines.push("■② 成果データ（今日の数字スナップ）");
    lines.push(report.snapshot || "―");
    lines.push("");
    lines.push("■③ 成功の種（できたこと・良かったこと）");
    lines.push(report.success || "―");
    lines.push("");
    lines.push("■④ 改善ポイントと明日の一手");
    lines.push(report.improvement || "―");
    lines.push("");
    lines.push("■⑤ グッドチーム！称賛ログ");
    lines.push(report.praise || "―");
    lines.push("");
    lines.push("■⑥ 今日の気持ち");
    if (report.mood || report.moodNote) {
      const moodLine = [report.mood || "", report.moodNote || ""].filter(Boolean).join(" ／ ");
      lines.push(moodLine);
    } else {
      lines.push("―");
    }
    return lines.join("\n");
  };

  const handleCopyForLine = async () => {
    if (!reports.length) {
      setCopyMessage("まず日報を保存してください。");
      return;
    }
    const latest = reports[0];
    const text = buildShareText(latest);
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("LINE長期インターングループに共有するところまでが日報のゴールです。すぐに貼り付けて送りましょう。");
      setTimeout(() => {
        setCopyMessage("");
      }, 4000);
    } catch (e) {
      setCopyMessage("コピーに失敗しました。ブラウザの権限設定を確認してください。");
    }
  };

  const moodOptions: MoodOption[] = [
    "最高！",
    "いい感じ",
    "普通",
    "少し疲れた",
    "しんどい…",
    "",
  ];

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-8 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Daily Report
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/daily-icon.svg"
                alt="日報アイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              日報ダッシュボード
            </h1>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            今日のアウトプット・数字・成功の種・改善・称賛・気持ちを一括で振り返るための日報画面です。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold">メンバー名</span>
            <select
              className="min-w-[180px] rounded-full border px-3 py-1 text-xs outline-none focus:ring"
              value={memberName}
              onChange={(e) => {
                const value = e.target.value;
                setMemberName(value);
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("igos_member_name", value);
                }
              }}
            >
              <option value="">メンバーを選択</option>
              {availableMembers
                .filter((m) => m.active)
                .map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <span className="font-semibold">今日の終了時刻</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-full border px-3 py-1 text-xs outline-none focus:ring"
            />
            <span className="text-[10px] text-neutral-500">
              例: 19:00（勤務終了時刻のメモ用）
            </span>
          </div>
        </header>

        <section className="space-y-6">
          {/* ① 今日のアウトプット（行動実績） */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/80" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ① 今日のアウトプット（行動実績）
              </h2>
            </div>
            <p className="mb-2 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              何を、どれだけ、どう動いた？（架電／商談／コンテンツ作成／顧客フォローなど）
            </p>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={4}
              placeholder="今日の行動を具体的に書いてみましょう。"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
          </div>

          {/* ② 成果データ（今日の数字スナップ） */}
          <div className="card-elevated border border-neutral-200/80 bg-white/90 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/70" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ② 成果データ（今日の数字スナップ）
              </h2>
            </div>
            <p className="mb-2 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              今日の「結果」をひと言で見える化（売上金額、アポ件数、投稿数、反応率など）
            </p>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={3}
              placeholder="今日の数字スナップをメモしましょう。"
              value={snapshot}
              onChange={(e) => setSnapshot(e.target.value)}
            />
          </div>

          {/* ③ 成功の種（できたこと・良かったこと） */}
          <div className="card-elevated border border-neutral-200/80 bg-white/90 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/70" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ③ 成功の種（できたこと・良かったこと）
              </h2>
            </div>
            <p className="mb-2 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              どんな工夫や判断が上手くいった？再現性ある成功パターンを言語化する欄です。
            </p>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={3}
              placeholder="小さな成功でもOK。良かったポイントを書き出してみましょう。"
              value={success}
              onChange={(e) => setSuccess(e.target.value)}
            />
          </div>

          {/* ④ 改善ポイントと明日の一手 */}
          <div className="card-elevated border border-neutral-200/80 bg-white/90 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/70" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ④ 改善ポイントと明日の一手
              </h2>
            </div>
            <p className="mb-2 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              明日、「ひとつだけ」変えるとしたら？改善を1つに絞ることで行動を変える欄です。
            </p>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={3}
              placeholder="明日ひとつだけ変える行動を書いてみましょう。"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
            />
          </div>

          {/* ⑤ グッドチーム！称賛ログ */}
          <div className="card-elevated border border-neutral-200/80 bg-white/90 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/70" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ⑤ グッドチーム！称賛ログ
              </h2>
            </div>
            <p className="mb-2 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              仲間のどの行動が魅力的だった？承認文化と良い行動の言語化につながる欄です。
            </p>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={3}
              placeholder="今日、心が動いた仲間の行動を書いてみましょう。"
              value={praise}
              onChange={(e) => setPraise(e.target.value)}
            />
          </div>

          {/* ⑥ 今日の気持ち（感情メーター） */}
          <div className="card-elevated border border-neutral-200/80 bg-white/90 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/70" style={{ borderColor: MAIN_COLOR }}>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="inline-block h-5 w-1 rounded-full"
                style={{ backgroundColor: MAIN_COLOR }}
              />
              <h2 className="text-sm font-semibold tracking-tight">
                ⑥ 今日の気持ち（感情メーター）
              </h2>
            </div>
            <p className="mb-3 mt-1 text-xs text-neutral-600 dark:text-neutral-300">
              今の気持ちをプルダウンで選んで、一言コメントを残せます。
            </p>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">今日の気持ち</span>
              <select
                className="rounded-full border px-3 py-1 text-xs outline-none focus:ring"
                value={mood}
                onChange={(e) => setMood(e.target.value as MoodOption)}
              >
                <option value="">選択してください</option>
                {moodOptions
                  .filter((label) => label !== "")
                  .map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
            <textarea
              className="mt-1 w-full rounded-2xl border p-3 text-sm outline-none focus:ring"
              rows={2}
              placeholder="ひと言メモ（例：今日は○○が嬉しかった / 少し疲れた理由 など）"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
            />
          </div>
        </section>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary px-6 py-2 text-xs font-semibold shadow-sm"
          >
            日報を保存する
          </button>
        </div>

        {reports.length > 0 && (
          <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-neutral-700 dark:text-neutral-200">
                  今日の日報一覧
                </h2>
                <p className="mt-1 text-[11px] text-neutral-500">
                  ※ 日報を書いたら、必ずLINE長期インターングループに共有するところまでやり切りましょう。
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <button
                  type="button"
                  onClick={handleCopyForLine}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-400"
                >
                  LINE共有用テキストをコピー
                </button>
                {copyMessage && (
                  <p className="text-[11px] text-neutral-500">{copyMessage}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900/80"
                >
                  <div className="mb-2 flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-300">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-100">
                        {report.memberName}
                      </span>
                      <span>
                        {report.dateLabel}
                        {report.endTime && `（終了: ${report.endTime}）`}
                      </span>
                    </div>
                    <span>
                      気持ち: {report.mood || "—"}
                      {report.moodNote && `（${report.moodNote}）`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p>
                      <span className="font-semibold">アウトプット：</span>
                      {report.output || "—" }
                    </p>
                    {report.snapshot && (
                      <p>
                        <span className="font-semibold">数字スナップ：</span>
                        {report.snapshot}
                      </p>
                    )}
                    {report.success && (
                      <p>
                        <span className="font-semibold">成功の種：</span>
                        {report.success}
                      </p>
                    )}
                    {report.improvement && (
                      <p>
                        <span className="font-semibold">明日の一手：</span>
                        {report.improvement}
                      </p>
                    )}
                    {report.praise && (
                      <p>
                        <span className="font-semibold">称賛ログ：</span>
                        {report.praise}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
