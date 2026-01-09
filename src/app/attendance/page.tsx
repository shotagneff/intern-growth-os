"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceRecord = {
  workDate: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  totalMinutes: number | null;
};

type MeResponse = {
  user: {
    id: string;
    memberId: string;
    name: string | null;
    isAdmin: boolean;
  } | null;
};

export default function AttendancePage() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState<string>("");
  const [monthlyTotalMinutes, setMonthlyTotalMinutes] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 修正申請用の状態
  const [editingDate, setEditingDate] = useState<string | null>(null); // YYYY-MM-DD
  const [editClockIn, setEditClockIn] = useState<string>(""); // HH:MM
  const [editClockOut, setEditClockOut] = useState<string>(""); // HH:MM
  const [editReason, setEditReason] = useState<string>("");

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data: MeResponse = await res.json();
        setMe(data.user);
      } catch (e) {
        console.error(e);
      } finally {
        setMeLoading(false);
      }
    };
    void fetchMe();
  }, []);

  const closeEditModal = () => {
    setEditingDate(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditReason("");
  };

  const handleSubmitChangeRequest = async () => {
    if (!editingDate) return;

    if (!editClockIn && !editClockOut) {
      setError("出勤か退勤のどちらかは入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const toIso = (dateStr: string, hm: string) => {
        const [h, m] = hm.split(":").map((v) => parseInt(v, 10));
        if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
        const d = new Date(`${dateStr}T00:00:00`);
        d.setHours(h, m, 0, 0);
        return d.toISOString();
      };

      const requestedClockInAt = editClockIn ? toIso(editingDate, editClockIn) : undefined;
      const requestedClockOutAt = editClockOut ? toIso(editingDate, editClockOut) : undefined;

      const res = await fetch("/api/attendance/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: editingDate,
          requestedClockInAt,
          requestedClockOutAt,
          reason: editReason,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "修正申請の送信に失敗しました");
      } else {
        setSuccessMessage("修正申請を送信しました");
        closeEditModal();
      }
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (targetMonth?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetMonth) {
        params.set("month", targetMonth);
      }
      const res = await fetch(`/api/attendance/me?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "勤怠情報の取得に失敗しました");
        setLoading(false);
        return;
      }
      setRecords(data.records ?? []);
      setMonth(data.month ?? "");
      setMonthlyTotalMinutes(data.monthlyTotalMinutes ?? 0);
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!meLoading && me) {
      void fetchAttendance();
    }
  }, [meLoading, me]);

  const todayKey = useMemo(() => {
    const now = new Date();
    // API 側の work_date と同じく、ローカルタイムベースで YYYY-MM-DD を組み立てる
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}`;
  }, []);

  const todayRecord = useMemo(
    () => records.find((r) => r.workDate === todayKey) ?? null,
    [records, todayKey],
  );

  const monthlyTotalHoursText = useMemo(() => {
    const h = Math.floor(monthlyTotalMinutes / 60);
    const m = monthlyTotalMinutes % 60;
    return `${h}時間${m}分`;
  }, [monthlyTotalMinutes]);

  const handleClockIn = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "出勤打刻に失敗しました");
      } else {
        await fetchAttendance(month || undefined);
        setSuccessMessage("出勤打刻を登録しました");
      }
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/attendance/clock-out", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "退勤打刻に失敗しました");
      } else {
        await fetchAttendance(month || undefined);
      }
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const goPrevMonth = () => {
    if (!month) return;
    const [y, m] = month.split("-").map((v) => parseInt(v, 10));
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    void fetchAttendance(target);
  };

  const goNextMonth = () => {
    if (!month) return;
    const [y, m] = month.split("-").map((v) => parseInt(v, 10));
    const d = new Date(y, m - 1, 1);
    d.setMonth(d.getMonth() + 1);
    const target = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    void fetchAttendance(target);
  };

  if (meLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-xs text-neutral-500">認証情報を確認中...</p>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          ログインしてから勤怠ページを利用してください。
        </p>
      </main>
    );
  }

  const hasClockIn = Boolean(todayRecord?.clockInAt);
  const hasClockOut = Boolean(todayRecord?.clockOutAt);

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-6">
        <header className="border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Attendance
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            勤怠管理
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            本日の出勤・退勤の打刻と、月ごとの勤務時間・修正申請を確認できます。
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            今日の打刻
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            本日 ({todayKey}) の出勤・退勤を記録します。
          </p>

          {error && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
          )}
          {successMessage && (
            <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{successMessage}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={handleClockIn}
              disabled={loading || hasClockIn}
              className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-emerald-500 text-lg font-semibold text-white shadow-md hover:bg-emerald-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasClockIn ? "出勤済み" : "出勤する"}
            </button>
            <button
              type="button"
              onClick={handleClockOut}
              disabled={loading || hasClockOut}
              className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-sky-500 text-lg font-semibold text-white shadow-md hover:bg-sky-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasClockOut ? "退勤済み" : "退勤する"}
            </button>

            <div className="ml-auto text-[11px] text-neutral-600 dark:text-neutral-300">
              <div>
                出勤: {todayRecord?.clockInAt
                  ? new Date(todayRecord.clockInAt).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </div>
              <div>
                退勤: {todayRecord?.clockOutAt
                  ? new Date(todayRecord.clockOutAt).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </div>
              <div>
                勤務時間: {todayRecord?.totalMinutes != null
                  ? `${Math.floor(todayRecord.totalMinutes / 60)}時間${todayRecord.totalMinutes % 60}分`
                  : "-"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                月別勤怠一覧
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                月ごとの出勤・退勤と勤務時間の一覧です。
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={goPrevMonth}
                className="rounded-full border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200"
              >
                前月
              </button>
              <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-200">
                {month || "-"}
              </span>
              <button
                type="button"
                onClick={goNextMonth}
                className="rounded-full border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200"
              >
                次月
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
            月合計: {monthlyTotalHoursText}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-neutral-700 dark:text-neutral-200">
              <thead>
                <tr className="border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700">
                  <th className="px-3 py-2">日付</th>
                  <th className="px-3 py-2">出勤</th>
                  <th className="px-3 py-2">退勤</th>
                  <th className="px-3 py-2">勤務時間</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const workDate = r.workDate
                    ? new Date(r.workDate).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })
                    : "-";
                  const clockIn = r.clockInAt
                    ? new Date(r.clockInAt).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  const clockOut = r.clockOutAt
                    ? new Date(r.clockOutAt).toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  const totalText =
                    r.totalMinutes != null
                      ? `${Math.floor(r.totalMinutes / 60)}時間${r.totalMinutes % 60}分`
                      : "-";

                  return (
                    <tr
                      key={workDate}
                      className="border-b border-neutral-100 text-sm last:border-b-0 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {workDate}
                      </td>
                      <td className="px-3 py-2">{clockIn}</td>
                      <td className="px-3 py-2">{clockOut}</td>
                      <td className="px-3 py-2 flex items-center justify-between gap-2">
                        <span>{totalText}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const baseDate = new Date(r.workDate);
                            const y = baseDate.getFullYear();
                            const m = String(baseDate.getMonth() + 1).padStart(2, "0");
                            const d = String(baseDate.getDate()).padStart(2, "0");
                            const normalized = `${y}-${m}-${d}`;

                            setEditingDate(normalized);

                            if (r.clockInAt) {
                              const ci = new Date(r.clockInAt);
                              setEditClockIn(
                                `${String(ci.getHours()).padStart(2, "0")}:${String(
                                  ci.getMinutes(),
                                ).padStart(2, "0")}`,
                              );
                            } else {
                              setEditClockIn("");
                            }

                            if (r.clockOutAt) {
                              const co = new Date(r.clockOutAt);
                              setEditClockOut(
                                `${String(co.getHours()).padStart(2, "0")}:${String(
                                  co.getMinutes(),
                                ).padStart(2, "0")}`,
                              );
                            } else {
                              setEditClockOut("");
                            }

                            setEditReason("");
                            setError(null);
                            setSuccessMessage(null);
                          }}
                          className="whitespace-nowrap rounded-full border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-100"
                        >
                          修正申請
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-xs text-neutral-500"
                    >
                      この月の勤怠はまだ登録されていません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        {editingDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 text-sm shadow-lg dark:bg-neutral-900">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                打刻修正申請
              </h3>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                対象日: {editingDate}
              </p>

              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-300">
                    出勤時刻 (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={editClockIn}
                    onChange={(e) => setEditClockIn(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-300">
                    退勤時刻 (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={editClockOut}
                    onChange={(e) => setEditClockOut(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-neutral-600 dark:text-neutral-300">
                    修正理由
                  </label>
                  <textarea
                    rows={3}
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                    placeholder="例：打刻を押し忘れていたため"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSubmitChangeRequest}
                  disabled={loading}
                  className="rounded-full bg-[#ad9c79] px-4 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-[#9b8a65] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "送信中..." : "申請を送信"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
