"use client";

import { useEffect, useState } from "react";

export default function LearningDashboardPage() {
  const course = {
    title: "長期インターン成長ブートキャンプ",
    description:
      "インターン開始〜リーダーへのステップアップまでに必要な基礎を、少しずつ身につけていく社内向けコースです。",
    totalLessons: 6,
    completedLessons: 2,
    startDate: "2025-04-01",
    difficulty: "インターン初日〜3ヶ月目向け",
    duration: "約3ヶ月（全6チャプター）",
    format: "オンデマンド動画＋ワーク＋フィードバック面談",
  };

  const steps = [
    {
      label: "Chapter 1",
      title: "インターンのゴールと期待役割を知る",
      unlocked: true,
      completed: true,
      unlockCondition: "参加初日に視聴しておきたいオリエンテーション動画です。",
    },
    {
      label: "Chapter 2",
      title: "営業の基本フローを理解する",
      unlocked: true,
      completed: false,
      unlockCondition: "Chapter 1 の内容を踏まえて、実務イメージを掴むためのステップです。",
    },
    {
      label: "Chapter 3",
      title: "トークスクリプトとロールプレイ",
      unlocked: false,
      completed: false,
      unlockCondition: "基礎理解のあと、ロープレや録画フィードバックとセットで解放されます。",
    },
    {
      label: "Chapter 4",
      title: "数字の追い方と日報の書き方",
      unlocked: false,
      completed: false,
      unlockCondition: "日々のKPI管理と日報（intern growth OS）と連動して学ぶステップです。",
    },
    {
      label: "Chapter 5",
      title: "顧客との信頼関係づくり",
      unlocked: false,
      completed: false,
      unlockCondition: "実際の商談同席や成功事例を見たタイミングで解放されます。",
    },
    {
      label: "Chapter 6",
      title: "リーダー候補向けマインドセット",
      unlocked: false,
      completed: false,
      unlockCondition: "一定期間の稼働と成果が見えたメンバー向けの上級編コンテンツです。",
    },
  ];

  const lessons = [
    {
      id: 1,
      title: "インターン全体像とキャリアパス",
      unlocked: true,
      week: "Week 1",
      duration: "15分",
      unlockDate: "2025-04-01",
    },
    {
      id: 2,
      title: "1日の流れとツールの使い方",
      unlocked: true,
      week: "Week 1",
      duration: "20分",
      unlockDate: "2025-04-01",
    },
    {
      id: 3,
      title: "日報の書き方（intern growth OS 連携）",
      unlocked: false,
      week: "Week 2",
      duration: "25分",
      unlockDate: "2025-04-08",
    },
    {
      id: 4,
      title: "初回アポイントで意識したいポイント",
      unlocked: false,
      week: "Week 3",
      duration: "30分",
      unlockDate: "2025-04-15",
    },
  ];

  const progressPercent =
    (course.completedLessons / course.totalLessons) * 100;

  const banners = [
    {
      id: 1,
      title: "今週のおすすめコンテンツ",
      body: "まずは『インターン全体像とキャリアパス』から視聴してみましょう。",
      cta: "Chapter 1 を見る",
      bg: "bg-gradient-to-r from-[#9e8d70] to-slate-700",
    },
    {
      id: 2,
      title: "日報 × 学習コンテンツ 連動企画",
      body: "学んだ内容を日報に一言アウトプットすると、定着度がぐっと上がります。",
      cta: "今日の学びを日報に書く",
      bg: "bg-gradient-to-r from-sky-500 to-emerald-500",
    },
    {
      id: 3,
      title: "リーダー候補向けコンテンツの先取り視聴",
      body: "早めに全体像を知りたい方向けに、上級編の一部を公開予定です。",
      cta: "予告を見る",
      bg: "bg-gradient-to-r from-slate-800 to-slate-600",
    },
  ];

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [banners.length]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {course.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {course.description}
          </p>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>
                学習状況: {course.completedLessons} / {course.totalLessons}
                チャプター完了
              </span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%`, backgroundColor: "#9e8d70" }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              受講開始日: <span className="font-medium text-slate-700">{course.startDate}</span>
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl shadow-sm">
          <div
            className={`flex items-center justify-between gap-4 px-5 py-4 text-white transition-colors duration-500 ${banners[activeBannerIndex].bg}`}
          >
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                Learning Info
              </p>
              <h2 className="mt-1 text-sm font-semibold">
                {banners[activeBannerIndex].title}
              </h2>
              <p className="mt-1 text-xs opacity-90">
                {banners[activeBannerIndex].body}
              </p>
              <button className="mt-3 inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm hover:bg-white">
                {banners[activeBannerIndex].cta}
              </button>
            </div>
            <div className="hidden h-16 w-28 rounded-lg bg-black/10 md:block" />
          </div>
          <div className="flex gap-1 bg-white/70 px-4 py-2">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setActiveBannerIndex(index)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  index === activeBannerIndex
                    ? "bg-[#9e8d70]"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
                aria-label={`バナー ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <section id="journey" className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold uppercase tracking-wide text-slate-600">
              学習ジャーニー
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              インターン開始からリーダー候補までの、おおまかな学習ステップです。
            </p>

            <div className="mt-4 space-y-3">
              {steps.map((step, index) => {
                const isCompleted = step.completed;
                const isUnlocked = step.unlocked;

                return (
                  <div
                    key={step.label}
                    className="flex items-start gap-3"
                  >
                    <div className="relative flex flex-col items-center">
                      {index !== 0 && (
                        <div className="absolute -top-4 h-4 w-px bg-slate-200" />
                      )}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold shadow-sm border
                        ${isCompleted
                          ? "bg-[#9e8d70] text-white border-[#9e8d70]"
                          : isUnlocked
                            ? "bg-white text-[#9e8d70] border-[#9e8d70]"
                            : "bg-slate-50 text-slate-400 border-slate-200"}
                        `}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col">
                      <span
                        className={`text-sm font-medium ${
                          isCompleted ? "text-slate-400" : "text-slate-700"
                        }`}
                      >
                        {step.label}
                      </span>
                      <span
                        className={`text-sm ${
                          isCompleted ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="mt-1 text-[12px] text-slate-500">
                        解放条件: {step.unlockCondition}
                      </span>
                    </div>

                    <span
                      className={`mt-1 text-[11px] font-medium ${
                        isCompleted
                          ? "text-slate-400"
                          : isUnlocked
                            ? "text-[#9e8d70]"
                            : "text-slate-400"
                      }`}
                    >
                      {isCompleted
                        ? "完了"
                        : isUnlocked
                          ? "解放済み"
                          : "ロック中"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div
              id="news"
              className="rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 p-4 text-white shadow-sm"
            >
              <h2 className="text-sm font-semibold">インターン向けお知らせ</h2>
              <p className="mt-1 text-xs opacity-90">
                次回のオンライン勉強会やロープレ会の情報はこちらにまとまります（ダミーテキスト）。
              </p>
            </div>

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">コース情報</h2>
              <dl className="mt-3 space-y-2 text-xs text-slate-600">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">対象</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {course.difficulty}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">想定期間</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {course.duration}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-slate-500">形式</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {course.format}
                  </dd>
                </div>
              </dl>
            </div>

            <div id="lessons" className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">
                レッスン一覧（ダミーデータ）
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-700">{lesson.title}</span>
                      <span className="mt-1 text-[11px] text-slate-500">
                        {lesson.week} / {lesson.duration}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold
                        ${lesson.unlocked
                          ? "bg-[#9e8d70]/10 text-[#9e8d70]"
                          : "bg-slate-100 text-slate-400"}
                      `}
                      >
                        {lesson.unlocked ? "解放済み" : "ロック中"}
                      </span>
                      {!lesson.unlocked && (
                        <span className="text-[10px] text-slate-400">
                          解放予定日: {lesson.unlockDate}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
