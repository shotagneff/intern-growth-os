"use client";

import React, { useEffect, useState } from "react";

export type HomeCalendarEvent = {
  id?: number;
  date: string;
  title: string;
  type: "internal" | "jobfair" | "training" | "other" | string;
  location: "online" | "osaka" | "tokyo" | "nagoya" | "other" | string;
  description?: string | null;
  applyUrl?: string | null;
  time?: string | null;
  lineKeyword?: string | null;
};

const TYPE_OPTIONS: { value: HomeCalendarEvent["type"]; label: string }[] = [
  { value: "internal", label: "社内イベント" },
  { value: "jobfair", label: "就活イベント" },
  { value: "training", label: "定期研修" },
  { value: "other", label: "その他" },
];

const LOCATION_OPTIONS: { value: HomeCalendarEvent["location"]; label: string }[] = [
  { value: "online", label: "オンライン" },
  { value: "osaka", label: "大阪" },
  { value: "tokyo", label: "東京" },
  { value: "nagoya", label: "名古屋" },
  { value: "other", label: "その他" },
];

export default function HomeCalendarAdminPage() {
  const [events, setEvents] = useState<HomeCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/home/calendar-events", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "イベント一覧の取得に失敗しました");
        return;
      }
      const data = (await res.json()) as { events: HomeCalendarEvent[] };
      setEvents(data.events);
    } catch (e) {
      console.error(e);
      setError("イベント一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, []);

  const handleAdd = () => {
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    setEvents((prev) => [
      {
        date,
        title: "新しいイベント",
        type: "internal",
        location: "online",
        description: "",
        time: "",
        applyUrl: "",
        lineKeyword: "",
      },
      ...prev,
    ]);
  };

  const handleChange = (index: number, patch: Partial<HomeCalendarEvent>) => {
    setEvents((prev) => prev.map((ev, i) => (i === index ? { ...ev, ...patch } : ev)));
  };

  const handleDelete = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/home/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "保存に失敗しました");
        return;
      }
      setSuccess("保存が完了しました");
    } catch (e) {
      console.error(e);
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleImportFromSheet = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/home/calendar-events/import-from-sheet", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "スプレッドシートからの同期に失敗しました");
        return;
      }
      await fetchEvents();
    } catch (e) {
      console.error(e);
      setError("スプレッドシートからの同期に失敗しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        ホームカレンダー管理
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        ホーム画面に表示されるカレンダーイベントを編集します。日付・タイトル・種別・場所・説明・時間・応募URLを管理できます。
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          イベントを追加
        </button>
        <button
          type="button"
          onClick={() => void fetchEvents()}
          className="inline-flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          再読み込み
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={() => void handleImportFromSheet()}
          disabled={importing}
          className="inline-flex items-center rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {importing ? "同期中..." : "スプレッドシートから同期"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {success && !error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
      )}

      {loading ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">読み込み中...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">まだイベントが登録されていません。</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev, index) => (
            <div
              key={ev.id ?? index}
              className="rounded-lg border border-neutral-200 bg-white p-3 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={ev.date}
                    onChange={(e) => handleChange(index, { date: e.target.value })}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                  <input
                    type="text"
                    value={ev.title}
                    onChange={(e) => handleChange(index, { title: e.target.value })}
                    className="min-w-[160px] flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                    placeholder="タイトル"
                  />
                  <select
                    value={ev.type}
                    onChange={(e) => handleChange(index, { type: e.target.value })}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ev.location}
                    onChange={(e) => handleChange(index, { location: e.target.value })}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  >
                    {LOCATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="inline-flex items-center rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-500/70 dark:text-red-300 dark:hover:bg-red-900/30"
                >
                  削除
                </button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    説明
                  </label>
                  <textarea
                    value={ev.description ?? ""}
                    onChange={(e) => handleChange(index, { description: e.target.value })}
                    className="h-16 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    時間（例: 19:00〜21:00）
                  </label>
                  <input
                    type="text"
                    value={ev.time ?? ""}
                    onChange={(e) => handleChange(index, { time: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    応募URL（任意）
                  </label>
                  <input
                    type="text"
                    value={ev.applyUrl ?? ""}
                    onChange={(e) => handleChange(index, { applyUrl: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                    LINE合言葉（任意）
                  </label>
                  <input
                    type="text"
                    value={ev.lineKeyword ?? ""}
                    onChange={(e) => handleChange(index, { lineKeyword: e.target.value })}
                    className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
