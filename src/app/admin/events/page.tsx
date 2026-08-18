"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PAGE_MAIN,
  PAGE_INNER,
  INPUT,
  PageHeader,
  SectionCard,
  Panel,
  PrimaryButton,
} from "@/components/panel";

type AdminEventType = "internal" | "training";

type AdminEvent = {
  id: string;
  companyName?: string;
  programName?: string;
  date?: string;
  place?: string;
  venue?: string;
  type?: string;
  industries?: string;
  conceptSummary?: string;
  companyCount?: number | null;
  capacity?: number | null;
  target?: string;
  reserveUrl?: string;
  time?: string;
  lineKeyword?: string;
  updatedAt?: string;
};

const typeLabel: Record<AdminEventType, string> = {
  internal: "社内イベント",
  training: "定期研修",
};

const normalizeAdminType = (raw: unknown): AdminEventType => {
  return raw === "training" ? "training" : "internal";
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const [date, setDate] = useState("");
  const [programName, setProgramName] = useState("");
  const [type, setType] = useState<AdminEventType>("internal");
  const [time, setTime] = useState("");
  const [internalPlace, setInternalPlace] = useState("");
  const [trainingPlace, setTrainingPlace] = useState("");
  const [conceptSummary, setConceptSummary] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/events", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = (await res.json()) as AdminEvent[];
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  const handleAdd = async () => {
    const d = date.trim();
    const p = programName.trim();
    if (!d || !p) {
      alert("日付（YYYY-MM-DD）とイベント名（programName）は必須です。");
      return;
    }

    const payload: Partial<AdminEvent> = {
      date: d,
      programName: p,
      type,
      time: time.trim() || undefined,
      place:
        type === "training"
          ? trainingPlace.trim() || undefined
          : internalPlace.trim() || undefined,
      conceptSummary: conceptSummary.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create event");

      setDate("");
      setProgramName("");
      setType("internal");
      setTime("");
      setInternalPlace("");
      setTrainingPlace("");
      setConceptSummary("");

      setMessage("イベントを追加しました。");
      setTimeout(() => setMessage(""), 2500);
      await fetchEvents();
    } catch (e) {
      console.error(e);
      setMessage("追加に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const updateEventLocal = (id: string, patch: Partial<AdminEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const handleSave = async (ev: AdminEvent) => {
    try {
      const res = await fetch("/api/admin/events", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
      });
      if (!res.ok) throw new Error("Failed to save event");
      setMessage("保存しました。");
      setTimeout(() => setMessage(""), 2000);
      await fetchEvents();
    } catch (e) {
      console.error(e);
      setMessage("保存に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("このイベントを削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/events?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
      setMessage("削除しました。");
      setTimeout(() => setMessage(""), 2000);
      await fetchEvents();
    } catch (e) {
      console.error(e);
      setMessage("削除に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [events]);

  const labelClass = "mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="Admin / Events"
          title="イベント管理"
          description="今月・来月のカレンダーに表示するイベントを管理します。"
          action={
            <button
              type="button"
              onClick={() => void fetchEvents()}
              className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              再読み込み
            </button>
          }
        />

        {message && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</p>
        )}

        <SectionCard title="イベントを追加">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>日付（必須）</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={labelClass}>種別</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AdminEventType)}
                className={INPUT}
              >
                <option value="internal">社内イベント</option>
                <option value="training">定期研修</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>イベント名（必須）</label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="例：社内キックオフMTG"
                className={INPUT}
              />
            </div>

            <div>
              <label className={labelClass}>時間</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="例：9:30〜"
                className={INPUT}
              />
            </div>
            <div>
              <label className={labelClass}>
                {type === "training" ? "定期研修用の場所" : "社内イベント用の場所"}
              </label>
              {type === "training" ? (
                <input
                  type="text"
                  value={trainingPlace}
                  onChange={(e) => setTrainingPlace(e.target.value)}
                  placeholder="例：オンライン / 会議室A"
                  className={INPUT}
                />
              ) : (
                <input
                  type="text"
                  value={internalPlace}
                  onChange={(e) => setInternalPlace(e.target.value)}
                  placeholder="例：東京 / オンライン"
                  className={INPUT}
                />
              )}
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className={labelClass}>コンセプト</label>
              <input
                type="text"
                value={conceptSummary}
                onChange={(e) => setConceptSummary(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          <div className="mt-4">
            <PrimaryButton type="button" onClick={() => void handleAdd()}>
              追加する
            </PrimaryButton>
          </div>
        </SectionCard>

        <SectionCard
          title="登録済みイベント"
          action={
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {loading ? "読み込み中..." : `${sorted.length} 件`}
            </span>
          }
        >
          {sorted.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">イベントがありません。</p>
          ) : (
            <div className="space-y-4">
              {sorted.map((ev) => {
                const normalizedType = normalizeAdminType(ev.type);
                const label = typeLabel[normalizedType];
                const header = ev.programName ?? "";

                return (
                  <Panel key={ev.id} className="p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                          {label}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">{header || "(無題)"}</div>
                        <div className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                          {ev.date ?? "-"} {ev.time ? `（${ev.time}）` : ""}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleSave(ev)}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(ev.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className={labelClass}>日付</label>
                        <input
                          type="date"
                          value={ev.date ?? ""}
                          onChange={(e) => updateEventLocal(ev.id, { date: e.target.value })}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>種別</label>
                        <select
                          value={normalizedType}
                          onChange={(e) => updateEventLocal(ev.id, { type: e.target.value })}
                          className={INPUT}
                        >
                          <option value="internal">社内イベント</option>
                          <option value="training">定期研修</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>イベント名</label>
                        <input
                          type="text"
                          value={ev.programName ?? ""}
                          onChange={(e) => updateEventLocal(ev.id, { programName: e.target.value })}
                          className={INPUT}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>時間</label>
                        <input
                          type="text"
                          value={ev.time ?? ""}
                          onChange={(e) => updateEventLocal(ev.id, { time: e.target.value })}
                          className={INPUT}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>
                          {normalizedType === "training" ? "定期研修用の場所" : "社内イベント用の場所"}
                        </label>
                        <input
                          type="text"
                          value={ev.place ?? ""}
                          onChange={(e) => updateEventLocal(ev.id, { place: e.target.value })}
                          className={INPUT}
                        />
                      </div>

                      <div className="sm:col-span-2 lg:col-span-4">
                        <label className={labelClass}>コンセプト</label>
                        <input
                          type="text"
                          value={ev.conceptSummary ?? ""}
                          onChange={(e) => updateEventLocal(ev.id, { conceptSummary: e.target.value })}
                          className={INPUT}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-[10px] text-neutral-400">
                      ID: {ev.id}
                      {ev.updatedAt ? ` / 更新: ${new Date(ev.updatedAt).toLocaleString()}` : ""}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
