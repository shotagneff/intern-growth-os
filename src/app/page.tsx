"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetEvents, setSheetEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [locationFilter, setLocationFilter] = useState<EventLocation | "all">("all");
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
  type EventLocation = "online" | "osaka" | "tokyo" | "other";

  type Event = {
    id: string;
    date: string; // YYYY-MM-DD
    title: string;
    type: EventType;
    location: EventLocation;
    conceptSummary?: string;
    industries?: string;
    companyCount?: number | null;
    capacity?: number | null;
    target?: string;
    reserveUrl?: string;
    time?: string; // 例: "19:00〜21:00"
    applyKeyword?: string;
  };

  type Announcement = {
    id: string;
    title: string;
    body: string;
    category?: string;
    linkUrl?: string;
    publishedAt?: string;
    authorMemberId?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type Member = {
    id: string;
    name: string;
    team?: string;
    role?: string;
    iconUrl?: string;
    active: boolean;
  };

  const formatAnnouncementDate = (a: Announcement): string => {
    const raw = (a.publishedAt || a.updatedAt || a.createdAt || "").trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString("ja-JP");
  };

  const typeLabel: Record<EventType, string> = {
    internal: "社内イベント",
    jobfair: "就活イベント",
    training: "定期研修",
    other: "就活イベント",
  };

  const locationLabel: Record<EventLocation, string> = {
    online: "オンライン",
    osaka: "大阪",
    tokyo: "東京",
    other: "その他",
  };

  const buildApplyKeyword = (event: Event) => {
    const base = event.applyKeyword?.trim()
      ? event.applyKeyword.trim()
      : event.type === "jobfair"
        ? "応募"
        : "";
    const loc = event.location === "other"
      ? ""
      : ` ${locationLabel[event.location]}`;
    return `${base} ${loc} ${event.title}`.trim();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) return;
        const rows = (await res.json()) as Array<Record<string, unknown>>;
        if (!Array.isArray(rows)) return;

        const normalizeLocation = (place: string, venue: string): EventLocation => {
          const v = `${place} ${venue}`.trim();
          if (v.includes("オンライン") || v.toLowerCase().includes("online")) return "online";
          if (v.includes("大阪")) return "osaka";
          if (v.includes("東京")) return "tokyo";
          return "other";
        };

        const mapped: Event[] = rows
          .map((r) => {
            const id = String(r.id ?? "").trim();
            const date = String(r.date ?? "").trim();
            const companyName = String(r.companyName ?? "").trim();
            const programName = String(r.programName ?? "").trim();
            const place = String(r.place ?? "").trim();
            const venue = String(r.venue ?? "").trim();
            const conceptSummary = String(r.conceptSummary ?? "").trim();
            const industries = String(r.industries ?? "").trim();
            const companyCountRaw = String(r.companyCount ?? "").trim();
            const capacityRaw = String(r.capacity ?? "").trim();
            const target = String(r.target ?? "").trim();
            const reserveUrl = String(r.reserveUrl ?? "").trim();
            const time = String(r.time ?? "").trim();
            const lineKeyword = String(r.lineKeyword ?? "").trim();

            const isAdmin = id.startsWith("admin:");

            const normalizeType = (raw: string): EventType => {
              const v = raw.trim().toLowerCase();
              if (v === "training" || v.includes("研修")) return "training";
              if (v === "internal" || v.includes("社内")) return "internal";
              if (v === "jobfair" || v.includes("job")) return "jobfair";
              return "other";
            };

            if (!date || !programName) return null;

            const type: EventType = isAdmin ? normalizeType(String(r.type ?? "")) : "jobfair";

            return {
              id,
              date,
              title: isAdmin ? programName : companyName ? `${companyName}｜${programName}` : programName,
              type,
              location: normalizeLocation(place, venue),
              conceptSummary: conceptSummary || undefined,
              industries: industries || undefined,
              companyCount: companyCountRaw ? Number(companyCountRaw.replace(/,/g, "")) : null,
              capacity: capacityRaw ? Number(capacityRaw.replace(/,/g, "")) : null,
              target: target || undefined,
              reserveUrl: reserveUrl || undefined,
              time: time || undefined,
              applyKeyword: lineKeyword || undefined,
            } as Event;
          })
          .filter((v): v is Event => v != null)
          .sort((a, b) => a.date.localeCompare(b.date));

        setSheetEvents(mapped);
      } catch (e) {
        console.error("failed to fetch events", e);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Announcement[];
        if (!Array.isArray(data)) return;
        setAnnouncements(data);
      } catch (e) {
        console.error("failed to fetch announcements", e);
      }
    };

    void loadAnnouncements();
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch("/api/admin/members", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Member[];
        if (!Array.isArray(data)) return;
        setMembers(data);
      } catch (e) {
        console.error("failed to fetch members", e);
      }
    };

    void loadMembers();
  }, []);

  const membersById = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const allEvents = useMemo(() => {
    return sheetEvents;
  }, [sheetEvents]);

  const visibleEvents = useMemo(() => {
    if (locationFilter === "all") return allEvents;
    return allEvents.filter((e) => e.location === locationFilter);
  }, [allEvents, locationFilter]);

  const eventsByDate = new Map<string, Event[]>();
  visibleEvents.forEach((event) => {
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
        <header className="pb-5">
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
        </header>

        {announcements.length > 0 && (
          <section className="pt-0">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  最新ニュース
                </h2>
              </div>

              <div className="mt-1 border-t border-neutral-200 dark:border-neutral-800" />
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {announcements.map((a) => {
                const dateText = formatAnnouncementDate(a);

                const author = a.authorMemberId ? membersById.get(a.authorMemberId) : undefined;

                const Wrapper: any = a.linkUrl ? "a" : "div";
                const wrapperProps = a.linkUrl
                  ? {
                      href: a.linkUrl,
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {};

                return (
                  <Wrapper
                    key={a.id}
                    {...wrapperProps}
                    className="block py-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[160px_1fr] sm:gap-6">
                      <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums">
                        {dateText}
                        {author && (
                          <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                            {author.iconUrl ? (
                              <Image
                                src={author.iconUrl}
                                alt=""
                                width={18}
                                height={18}
                                className="h-[18px] w-[18px] rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-[18px] w-[18px] rounded-full bg-neutral-200 dark:bg-neutral-800" />
                            )}
                            <span>{author.name}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                          {a.title}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-neutral-600 dark:text-neutral-300">
                          {a.body}
                        </div>
                        {a.linkUrl && (
                          <div className="mt-2 text-[11px] font-semibold text-neutral-700 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-500 dark:text-neutral-200 dark:decoration-neutral-700 dark:hover:decoration-neutral-500">
                            詳細を見る ↗
                          </div>
                        )}
                      </div>
                    </div>
                  </Wrapper>
                );
              })}
              </div>
              <div className="border-b border-neutral-200 dark:border-neutral-800" />
            </div>
          </section>
        )}

        {/* カレンダー＋詳細 */}
        <section className="pt-4 text-xs text-neutral-600 dark:text-neutral-300">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            カレンダー
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            今月と来月の社内イベント・就活イベント・定期研修の予定を確認するためのカレンダーです
          </p>

          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400 sm:hidden">
            日付をタップすると、下にイベントの詳細が表示されます。
          </p>

          {/* 凡例 */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-xs text-neutral-600 dark:text-neutral-300">例:</span>
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

          <div className="mt-3 max-w-[240px]">
            <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              場所で絞り込み
            </label>
            <select
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
              value={locationFilter}
              onChange={(e) => {
                const next = e.target.value as EventLocation | "all";
                setLocationFilter(next);
                setSelectedDate(null);
              }}
            >
              <option value="all">すべて</option>
              <option value="online">オンライン</option>
              <option value="osaka">大阪</option>
              <option value="tokyo">東京</option>
              <option value="other">その他</option>
            </select>
          </div>

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
                                    : event.type === "training"
                                    ? "bg-amber-600 text-white border-amber-700 dark:bg-amber-600 dark:text-white dark:border-amber-500"
                                    : "bg-sky-600 text-white border-sky-700 dark:bg-sky-600 dark:text-white dark:border-sky-500";
                                return (
                                  <div
                                    key={`${event.title}-${idx}`}
                                    className={`flex w-full md:w-auto items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${typeColor}`}
                                  >
                                    <span className="hidden md:inline">
                                      {event.type === "internal"
                                        ? "社内"
                                        : event.type === "training"
                                        ? "研修"
                                        : "就活"}
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
                                    : event.type === "training"
                                    ? "bg-amber-600 text-white border-amber-700 dark:bg-amber-600 dark:text-white dark:border-amber-500"
                                    : "bg-sky-600 text-white border-sky-700 dark:bg-sky-600 dark:text-white dark:border-sky-500";
                                return (
                                  <div
                                    key={`${event.title}-${idx}`}
                                    className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] ${typeColor}`}
                                  >
                                    <span className="hidden md:inline">
                                      {event.type === "internal"
                                        ? "社内"
                                        : event.type === "training"
                                        ? "研修"
                                        : "就活"}
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
                      {selectedEvents.map((event) => {
                        const isJobfair = event.type === "jobfair";
                        const keyword = isJobfair ? buildApplyKeyword(event) : "";
                        const concept = event.conceptSummary || "-";
                        const industries = event.industries || "-";
                        const counts = `${event.companyCount != null ? `${event.companyCount}社` : "-"} / ${
                          event.capacity != null ? `${event.capacity}人` : "-"
                        }`;
                        const target = event.target || "-";
                        const reserveUrl = event.reserveUrl || "-";
                        return (
                          <li
                            key={event.id || `${event.date}-${event.title}`}
                            className={`relative overflow-hidden rounded-lg p-2 text-[11px] shadow-sm border
                              ${
                                event.type === "internal"
                                  ? "border-emerald-700 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600"
                                  : event.type === "jobfair"
                                  ? "border-sky-700 bg-gradient-to-br from-sky-600 via-sky-600 to-indigo-600 text-white ring-1 ring-white/10 dark:border-sky-500"
                                  : event.type === "training"
                                  ? "border-amber-700 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-600"
                                  : "border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                              }
                            `}
                          >
                            {event.type === "jobfair" && (
                              <div
                                aria-hidden
                                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/20 blur-2xl"
                              />
                            )}

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
                                  <span className="text-xs">{typeLabel[event.type]}</span>
                                  <span className="text-[11px] text-neutral-500">/</span>
                                  <span className="text-xs">{locationLabel[event.location]}</span>
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 space-y-1 text-[11px] text-white/85">
                              <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                コンセプト
                              </div>
                              <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                {concept}
                              </div>
                            </div>

                            {isJobfair && (
                              <>
                                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                    業界
                                  </div>
                                  <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                    {industries}
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                    参加企業数・定員
                                  </div>
                                  <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                    {counts}
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                    おすすめの学生像
                                  </div>
                                  <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                    {target}
                                  </div>
                                </div>

                                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                    応募キーワード
                                  </div>
                                  <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                    <div className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-[#06C755] shadow-sm">
                                      <span className="block h-3 w-4 rounded-full bg-white" />
                                      <span className="absolute bottom-[6px] left-[8px] h-2 w-2 rotate-45 rounded-[2px] bg-white" />
                                    </div>
                                    <span className="font-semibold truncate">{keyword}</span>
                                  </div>
                                  <p className="text-[10px] text-white/75">
                                    公式LINEでこのキーワードを送信すると、応募フォームが届きます。
                                  </p>
                                </div>

                                <div className="mt-2 space-y-1 text-[11px] text-white/85">
                                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                                    予約URL
                                  </div>
                                  {event.reserveUrl ? (
                                    <a
                                      href={event.reserveUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center justify-between gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-sky-700 shadow-sm hover:bg-white"
                                    >
                                      <span className="truncate">予約URLを開く</span>
                                      <span className="text-[11px] text-sky-500">↗</span>
                                    </a>
                                  ) : (
                                    <div className="rounded-lg bg-white/10 px-2.5 py-1.5 text-sm text-white/95 shadow-sm">
                                      {reserveUrl}
                                    </div>
                                  )}
                                </div>
                              </>
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
