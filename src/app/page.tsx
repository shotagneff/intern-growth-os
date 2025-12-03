"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<"all" | EventLocation>("all");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const buildWeeks = (y: number, m: number): (number | null)[][] => {
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const result: (number | null)[][] = [];
    let currentDay = 1;
    while (currentDay <= daysInMonth) {
      const week: (number | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (result.length === 0 && i < firstDay) {
          week.push(null);
        } else if (currentDay <= daysInMonth) {
          week.push(currentDay);
          currentDay++;
        } else {
          week.push(null);
        }
      }
      result.push(week);
    }
    return result;
  };

  const weeksCurrent = buildWeeks(year, month);
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const weeksNext = buildWeeks(nextYear, nextMonth);

  type EventType = "internal" | "jobfair" | "training" | "other";
  type EventLocation = "online" | "osaka" | "tokyo" | "nagoya" | "other";

  type Event = {
    date: string; // YYYY-MM-DD
    title: string;
    type: EventType;
    location: EventLocation;
    description?: string;
    applyUrl?: string;
    time?: string; // 例: "19:00〜21:00"
    lineKeyword?: string;
  };

  const typeLabel: Record<EventType, string> = {
    internal: "社内イベント",
    jobfair: "就活イベント",
    training: "定期研修",
    other: "その他",
  };

  const locationLabel: Record<EventLocation, string> = {
    online: "オンライン",
    osaka: "大阪",
    tokyo: "東京",
    nagoya: "名古屋",
    other: "その他",
  };

  const buildApplyKeyword = (event: Event) => {
    // 応募用キーワード（LINE応答メッセージ用）を自動生成（デフォルト）
    // 現状は就活イベント（jobfair）のみに利用
    const base = "応募:就活イベント";
    const loc =
      event.location === "online"
        ? "オンライン"
        : event.location === "osaka"
        ? "大阪"
        : event.location === "tokyo"
        ? "東京"
        : event.location === "nagoya"
        ? "名古屋"
        : "";
    return `${base} ${loc} ${event.title}`.trim();
  };

  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/home/calendar-events", { cache: "no-store" });
        if (!res.ok) {
          console.error("failed to fetch home calendar events", await res.text().catch(() => ""));
          setEvents([]);
          return;
        }
        const data = (await res.json().catch(() => null)) as { events?: Event[] } | null;
        if (data?.events && Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events as Event[]);
        } else {
          setEvents([]);
        }
      } catch (e) {
        console.error("failed to fetch home calendar events", e);
        setEvents([]);
      }
    };

    void fetchEvents();
  }, []);

  const effectiveEvents = events.filter((event: Event) =>
    locationFilter === "all" ? true : event.location === locationFilter
  );

  const eventsByDate = new Map<string, Event[]>();
  effectiveEvents.forEach((event: Event) => {
    const arr = eventsByDate.get(event.date) ?? [];
    arr.push(event);
    eventsByDate.set(event.date, arr);
  });

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  const todayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-8">
        {/* ヘッダー */}
        <header className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            intern growth OS
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/homeicon.png"
                alt="ホームアイコン"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              ホーム
            </h1>
          </div>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            日報・売上/KPI・動画研修・パートナー紹介・ランキング・ドキュメントなど、長期インターンの活動に必要なコンテンツはこちらからアクセスできます。
          </p>
        </header>

        {/* カレンダー＋詳細 */}
        <section className="pt-4 text-xs text-neutral-600 dark:text-neutral-300">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            カレンダー
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            今月と来月の社内イベント・就活イベント・定期研修の予定を確認するためのカレンダーです。
          </p>

          {/* 凡例 */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-xs text-neutral-600 dark:text-neutral-300">凡例:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-emerald-600 dark:text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              社内イベント
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-sky-600 dark:text-white">
              <span className="h-2 w-2 rounded-full bg-sky-300" />
              就活イベント
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-amber-600 dark:text-white">
              <span className="h-2 w-2 rounded-full bg-amber-300" />
              定期研修
            </span>
          </div>

          {/* 場所フィルタ */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-xs text-neutral-600 dark:text-neutral-300">場所で絞り込み:</span>
            {[
              { value: "all" as const, label: "すべて" },
              { value: "online" as const, label: locationLabel.online },
              { value: "osaka" as const, label: locationLabel.osaka },
              { value: "tokyo" as const, label: locationLabel.tokyo },
              { value: "other" as const, label: locationLabel.other },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocationFilter(opt.value)}
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors
                  ${
                    locationFilter === opt.value
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-50 dark:bg-neutral-50 dark:text-neutral-900"
                      : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-500">
            ※ カレンダー上のイベントがある日付をタップすると、下にその日の詳細が表示されます。
          </p>

          <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(260px,1.2fr)]">
            {/* 左側：2ヶ月分のカレンダー */}
            <div className="space-y-4">
              {/* 今月 */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
                <div className="flex items-center justify-between text-[15px] text-neutral-700 dark:text-neutral-200">
                  <span className="text-lg font-semibold">
                    {year}年 {month + 1}月
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    （ブラウザ日時を元に自動表示）
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] text-neutral-500">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
                    <div
                      key={d}
                      className={`py-2 font-semibold rounded-md bg-neutral-50/70 dark:bg-neutral-900/40 ${
                        idx === 0
                          ? "text-rose-500 dark:text-rose-300"
                          : idx === 6
                          ? "text-sky-500 dark:text-sky-300"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                  {weeksCurrent.map((week, wi) =>
                    week.map((day, di) => {
                      const dateKey =
                        day !== null
                          ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          : "";
                      const dayEvents = day !== null ? eventsByDate.get(dateKey) ?? [] : [];
                      const hasEvents = dayEvents.length > 0;
                      const isSelected = selectedDate === dateKey;
                      const isToday = dateKey === todayKey;
                      return (
                        <button
                          key={`${wi}-${di}`}
                          type="button"
                          onClick={() => hasEvents && setSelectedDate(dateKey)}
                          className={`h-20 w-full text-left rounded-md border text-[13px] flex flex-col items-center justify-start px-1.5 pt-1.5 pb-1.5 transition-shadow transition-colors duration-150
                            ${
                              day
                                ? isSelected
                                  ? "border-sky-400 bg-sky-50 text-neutral-800 shadow-[0_0_0_1px_rgba(56,189,248,0.4)] dark:border-sky-400 dark:bg-sky-900/30 dark:text-neutral-50"
                                  : isToday
                                  ? "border-indigo-400 bg-indigo-50 text-neutral-800 shadow-[0_0_0_1px_rgba(129,140,248,0.45)] dark:border-indigo-400 dark:bg-indigo-900/40 dark:text-neutral-50"
                                  : "border-neutral-200 bg-white text-neutral-700 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                : "border-transparent"
                            }
                          `}
                        >
                          <span className="text-[12px] font-semibold self-start pl-0.5">{day ?? ""}</span>
                          {hasEvents && (
                            <div className="mt-0.5 flex w-full flex-col gap-0.5 items-start">
                              {dayEvents.slice(0, 2).map((event, idx) => {
                                const typeColor =
                                  event.type === "internal"
                                    ? "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-600 dark:text-white dark:border-emerald-500"
                                    : event.type === "jobfair"
                                    ? "bg-sky-600 text-white border-sky-700 dark:bg-sky-600 dark:text-white dark:border-sky-500"
                                    : event.type === "training"
                                    ? "bg-amber-600 text-white border-amber-700 dark:bg-amber-600 dark:text-white dark:border-amber-500"
                                    : "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600";
                                return (
                                  <div
                                    key={`${event.title}-${idx}`}
                                    className={`flex w-full md:w-auto items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${typeColor}`}
                                  >
                                    <span className="hidden md:inline">
                                      {event.type === "internal"
                                        ? "社内"
                                        : event.type === "jobfair"
                                        ? "就活"
                                        : event.type === "training"
                                        ? "研修"
                                        : "その他"}
                                    </span>
                                    <span className="hidden md:inline text-[8px] text-white/90">
                                      {locationLabel[event.location]}
                                    </span>
                                  </div>
                                );
                              })}
                              {dayEvents.length > 2 && (
                                <span className="text-[8px] text-neutral-400">
                                  ほか {dayEvents.length - 2} 件
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>

              {/* 来月 */}
              <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
                <div className="flex items-center justify-between text-[15px] text-neutral-700 dark:text-neutral-200">
                  <span className="text-lg font-semibold">
                    {nextYear}年 {nextMonth + 1}月
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    （常に来月まで表示）
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[12px] text-neutral-500">
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
                    <div
                      key={d}
                      className={`py-2 font-semibold rounded-md ${
                        idx === 0
                          ? "text-rose-500 dark:text-rose-300"
                          : idx === 6
                          ? "text-sky-500 dark:text-sky-300"
                          : "text-neutral-500 dark:text-neutral-400"
                      }`}
                    >
                      {d}
                    </div>
                  ))}
                  {weeksNext.map((week, wi) =>
                    week.map((day, di) => {
                      const dateKey =
                        day !== null
                          ? `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                          : "";
                      const dayEvents = day !== null ? eventsByDate.get(dateKey) ?? [] : [];
                      const hasEvents = dayEvents.length > 0;
                      const isSelected = selectedDate === dateKey;
                      return (
                        <button
                          key={`${wi}-${di}`}
                          type="button"
                          onClick={() => hasEvents && setSelectedDate(dateKey)}
                          className={`h-16 w-full text-left rounded-md border text-[12px] flex flex-col items-center justify-start px-1 pt-1 pb-1
                            ${
                              day
                                ? isSelected
                                  ? "border-sky-400 bg-sky-50 text-neutral-800 shadow-[0_0_0_1px_rgba(56,189,248,0.4)] dark:border-sky-400 dark:bg-sky-900/30 dark:text-neutral-50"
                                  : "border-neutral-200 bg-white text-neutral-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                                : "border-transparent"
                            }
                          `}
                        >
                          <span className="text-[12px] font-semibold self-start pl-0.5">{day ?? ""}</span>
                          {hasEvents && (
                            <div className="mt-0.5 flex w-full flex-col gap-0.5">
                              {dayEvents.slice(0, 2).map((event, idx) => {
                                const typeColor =
                                  event.type === "internal"
                                    ? "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-600 dark:text-white dark:border-emerald-500"
                                    : event.type === "jobfair"
                                    ? "bg-sky-600 text-white border-sky-700 dark:bg-sky-600 dark:text-white dark:border-sky-500"
                                    : event.type === "training"
                                    ? "bg-amber-600 text-white border-amber-700 dark:bg-amber-600 dark:text-white dark:border-amber-500"
                                    : "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-600";
                                return (
                                  <div
                                    key={`${event.title}-${idx}`}
                                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${typeColor}`}
                                  >
                                    <span className="hidden md:inline">
                                      {event.type === "internal"
                                        ? "社内"
                                        : event.type === "jobfair"
                                        ? "就活"
                                        : event.type === "training"
                                        ? "研修"
                                        : "その他"}
                                    </span>
                                    <span className="hidden md:inline text-[8px] text-white/90">
                                      {locationLabel[event.location]}
                                    </span>
                                  </div>
                                );
                              })}
                              {dayEvents.length > 2 && (
                                <span className="text-[8px] text-neutral-400">
                                  ほか {dayEvents.length - 2} 件
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    }),
                  )}
                </div>
              </div>
            </div>

            {/* 右側：選択した日のイベント詳細 */}
            <aside className="rounded-2xl border border-neutral-200 bg-white p-4 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                選択した日のイベント
              </h3>

              {!selectedDate || selectedEvents.length === 0 ? (
                <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                  カレンダー上のイベントがある日付をクリックすると、ここに詳細が表示されます。
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      日付: {selectedDate}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {selectedEvents.map((event, idx) => {
                        const hasKeyword = event.type === "jobfair";
                        const keyword = hasKeyword
                          ? (event.lineKeyword && event.lineKeyword.trim().length > 0
                              ? event.lineKeyword
                              : buildApplyKeyword(event))
                          : "";
                        return (
                          <li
                            key={`${event.date}-${event.title}-${idx}`}
                            className={`rounded-lg p-2 text-[11px] shadow-sm border
                              ${
                                event.type === "internal"
                                  ? "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600"
                                  : event.type === "jobfair"
                                  ? "border-sky-700 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-600"
                                  : event.type === "training"
                                  ? "border-amber-700 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-600"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                              }
                            `}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold flex items-center gap-1">
                                  <span>{event.title}</span>
                                  {event.time && (
                                    <span className="text-sm font-normal text-white/85">
                                      （{event.time}）
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-neutral-800 dark:bg-white dark:text-neutral-900">
                                  <span className="text-xs">
                                    {typeLabel[event.type]}
                                  </span>
                                  <span className="text-[11px] text-neutral-500">/</span>
                                  <span className="text-xs">
                                    {locationLabel[event.location]}
                                  </span>
                                </span>
                              </div>
                            </div>
                            {event.description && (
                              <div className="mt-1 text-xs text-white/90 whitespace-pre-line">
                                {event.description}
                              </div>
                            )}

                            {/* 就活イベントのみ：応募キーワード（LINE用） */}
                            {hasKeyword && (
                              <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                  応募キーワード
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                  <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-[#06C755] shadow-sm">
                                    <span className="block h-3 w-4 rounded-full bg-white" />
                                    <span className="absolute bottom-[6px] left-[8px] h-2 w-2 rotate-45 rounded-[2px] bg-white" />
                                  </div>
                                  <span className="font-semibold truncate">
                                    {keyword}
                                  </span>
                                </div>
                                <p className="text-[10px] text-white/75">
                                  公式LINEでこのキーワードを送信すると、応募フォームが届きます。
                                </p>
                              </div>
                            )}

                            {/* 社内イベントのみ：応募URL */}
                            {event.type === "internal" && event.applyUrl && (
                              <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                  応募URL
                                </div>
                                <a
                                  href={event.applyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm hover:bg-white"
                                >
                                  <span className="truncate">応募フォームを開く</span>
                                  <span className="text-[11px] text-emerald-500">↗</span>
                                </a>
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
