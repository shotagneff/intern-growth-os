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
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_hiraga.jpg",
    active: true,
  },
  {
    id: "takuma",
    name: "宅間　宗大",
    team: "営業",
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_takuma.jpg",
    active: true,
  },
  {
    id: "sato",
    name: "佐藤　翔永",
    team: "営業",
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_sato.png",
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
      setCopyMessage("シークアドLINEグループに共有するところまでが日報のゴールです。すぐに貼り付けて送りましょう。");
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

  const TEXTAREA =
    "w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-6">
        <header className="pb-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Daily Report
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/images/icons/daily-icon.svg"
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
        </header>

        {/* 記入者・終了時刻 */}
        <div className="rounded-2xl border border-neutral-200 bg-white/90 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-neutral-600 dark:text-neutral-300">
            <div className="flex items-center gap-2">
              <span className="font-semibold">メンバー名</span>
              <select
                className="min-w-[180px] rounded-full border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
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
            <div className="flex items-center gap-2">
              <span className="font-semibold">今日の終了時刻</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
              />
              <span className="text-[10px] text-neutral-500">例: 19:00（勤務終了時刻のメモ用）</span>
            </div>
          </div>
        </div>

        <section className="space-y-5">
          <FieldPanel
            title="① 今日のアウトプット（行動実績）"
            desc="何を、どれだけ、どう動いた？（架電／商談／コンテンツ作成／顧客フォローなど）"
          >
            <textarea
              className={TEXTAREA}
              rows={4}
              placeholder="今日の行動を具体的に書いてみましょう。"
              value={output}
              onChange={(e) => setOutput(e.target.value)}
            />
          </FieldPanel>

          <FieldPanel
            title="② 成果データ（今日の数字スナップ）"
            desc="今日の「結果」をひと言で見える化（売上金額、アポ件数、投稿数、反応率など）"
          >
            <textarea
              className={TEXTAREA}
              rows={3}
              placeholder="今日の数字スナップをメモしましょう。"
              value={snapshot}
              onChange={(e) => setSnapshot(e.target.value)}
            />
          </FieldPanel>

          <FieldPanel
            title="③ 成功の種（できたこと・良かったこと）"
            desc="どんな工夫や判断が上手くいった？再現性ある成功パターンを言語化する欄です。"
          >
            <textarea
              className={TEXTAREA}
              rows={3}
              placeholder="小さな成功でもOK。良かったポイントを書き出してみましょう。"
              value={success}
              onChange={(e) => setSuccess(e.target.value)}
            />
          </FieldPanel>

          <FieldPanel
            title="④ 改善ポイントと明日の一手"
            desc="明日、「ひとつだけ」変えるとしたら？改善を1つに絞ることで行動を変える欄です。"
          >
            <textarea
              className={TEXTAREA}
              rows={3}
              placeholder="明日ひとつだけ変える行動を書いてみましょう。"
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
            />
          </FieldPanel>

          <FieldPanel
            title="⑤ グッドチーム！称賛ログ"
            desc="仲間のどの行動が魅力的だった？承認文化と良い行動の言語化につながる欄です。"
          >
            <textarea
              className={TEXTAREA}
              rows={3}
              placeholder="今日、心が動いた仲間の行動を書いてみましょう。"
              value={praise}
              onChange={(e) => setPraise(e.target.value)}
            />
          </FieldPanel>

          <FieldPanel
            title="⑥ 今日の気持ち（感情メーター）"
            desc="今の気持ちをプルダウンで選んで、一言コメントを残せます。"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold">今日の気持ち</span>
              <select
                className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs outline-none focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
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
              className={TEXTAREA}
              rows={2}
              placeholder="ひと言メモ（例：今日は○○が嬉しかった / 少し疲れた理由 など）"
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
            />
          </FieldPanel>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: MAIN_COLOR }}
          >
            日報を保存する
          </button>
        </div>

        {reports.length > 0 && (
          <section className="rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="flex flex-col items-start gap-2 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
                  今日の日報一覧
                </h2>
                <p className="mt-1 text-[11px] text-neutral-500">
                  ※ 日報を書いたら、必ずシークアドLINEグループに共有するところまでやり切りましょう。
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <button
                  type="button"
                  onClick={handleCopyForLine}
                  className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  LINE共有用テキストをコピー
                </button>
                {copyMessage && <p className="text-[11px] text-neutral-500">{copyMessage}</p>}
              </div>
            </div>
            <div className="space-y-3 p-5">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80"
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
                      {report.output || "—"}
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

/** 見出し＋説明つきのパネル。日報の各記入欄をカードに揃える */
function FieldPanel({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="inline-block h-5 w-1 rounded-full" style={{ backgroundColor: MAIN_COLOR }} />
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {desc && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{desc}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
