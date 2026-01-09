"use client";

import { useEffect, useMemo, useState } from "react";

type AdminMeResponse = {
  user: {
    id: string;
    memberId: string;
    name: string | null;
    isAdmin: boolean;
  } | null;
};

type MemberAttendance = {
  memberId: string;
  memberName: string | null;
  records: {
    workDate: string;
    clockInAt: string | null;
    clockOutAt: string | null;
    totalMinutes: number | null;
  }[];
  monthlyTotalMinutes: number;
};

type AdminAttendanceResponse = {
  month: string;
  members: MemberAttendance[];
};

type ChangeRequest = {
  id: string;
  memberId: string;
  memberName: string | null;
  targetDate: string;
  requestedClockInAt: string | null;
  requestedClockOutAt: string | null;
  reason: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

export default function AdminAttendancePage() {
  const [meLoading, setMeLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [month, setMonth] = useState<string>("");
  const [members, setMembers] = useState<MemberAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [changeRequestsLoading, setChangeRequestsLoading] = useState(false);
  const [changeRequestsError, setChangeRequestsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data: AdminMeResponse = await res.json();
        if (data?.user?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setMeLoading(false);
      }
    };

    void fetchMe();
  }, []);

  const fetchAttendance = async (targetMonth?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetMonth) {
        params.set("month", targetMonth);
      }
      const res = await fetch(`/api/attendance/admin/records?${params.toString()}`);
      const data: AdminAttendanceResponse = await res.json();
      if (!res.ok) {
        setError((data as any)?.error || "勤怠情報の取得に失敗しました");
        setLoading(false);
        return;
      }
      setMembers(data.members ?? []);
      setMonth(data.month ?? "");
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const fetchChangeRequests = async () => {
    setChangeRequestsLoading(true);
    setChangeRequestsError(null);
    try {
      const res = await fetch("/api/attendance/change-requests?status=pending");
      const data = await res.json();
      if (!res.ok) {
        setChangeRequestsError(data?.error || "修正申請の取得に失敗しました");
        setChangeRequestsLoading(false);
        return;
      }
      setChangeRequests((data.requests || []) as ChangeRequest[]);
    } catch (e) {
      console.error(e);
      setChangeRequestsError("通信に失敗しました");
    } finally {
      setChangeRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!meLoading && isAdmin) {
      void fetchAttendance();
      void fetchChangeRequests();
    }
  }, [meLoading, isAdmin]);

  const handleChangeRequestAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/attendance/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, requestId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChangeRequestsError(data?.error || "処理に失敗しました");
        return;
      }
      // 再取得
      await fetchChangeRequests();
      // 勤怠レコードも更新されている可能性があるので再取得
      await fetchAttendance(month || undefined);
    } catch (e) {
      console.error(e);
      setChangeRequestsError("通信に失敗しました");
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

  const totalAllMinutes = useMemo(
    () => members.reduce((sum, m) => sum + (m.monthlyTotalMinutes ?? 0), 0),
    [members],
  );

  const totalAllHoursText = useMemo(() => {
    const h = Math.floor(totalAllMinutes / 60);
    const m = totalAllMinutes % 60;
    return `${h}時間${m}分`;
  }, [totalAllMinutes]);

  if (meLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-xs text-neutral-500">認証情報を確認中...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          このページにアクセスする権限がありません。
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-[var(--foreground)] dark:bg-neutral-950">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            管理者用 勤怠一覧
          </h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            メンバーごとの月次勤怠を一覧で確認できます。
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                対象月
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                左右のボタンで月を切り替えられます。
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
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
            全メンバー合計: {totalAllHoursText}
          </div>

          {error && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                修正申請（承認待ち）
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500">
                メンバーからの打刻修正申請を承認 / 却下できます。
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void fetchChangeRequests();
              }}
              className="rounded-full border border-neutral-300 px-3 py-1 text-[11px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200"
            >
              更新
            </button>
          </div>

          {changeRequestsError && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{changeRequestsError}</p>
          )}

          {changeRequestsLoading && (
            <p className="mt-3 text-xs text-neutral-500">読み込み中...</p>
          )}

          {!changeRequestsLoading && changeRequests.length === 0 && !changeRequestsError && (
            <p className="mt-3 text-xs text-neutral-500">承認待ちの修正申請はありません。</p>
          )}

          {changeRequests.length > 0 && (
            <div className="mt-3 overflow-x-auto text-xs">
              <table className="min-w-full text-left text-[11px] text-neutral-700 dark:text-neutral-200">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] text-neutral-500 dark:border-neutral-700">
                    <th className="px-2 py-1.5">メンバー</th>
                    <th className="px-2 py-1.5">対象日</th>
                    <th className="px-2 py-1.5">出勤(申請)</th>
                    <th className="px-2 py-1.5">退勤(申請)</th>
                    <th className="px-2 py-1.5">理由</th>
                    <th className="px-2 py-1.5">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {changeRequests.map((r) => {
                    const dateText = r.targetDate
                      ? new Date(r.targetDate).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "-";
                    const reqCi = r.requestedClockInAt
                      ? new Date(r.requestedClockInAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";
                    const reqCo = r.requestedClockOutAt
                      ? new Date(r.requestedClockOutAt).toLocaleTimeString("ja-JP", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <tr
                        key={r.id}
                        className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-800"
                      >
                        <td className="px-2 py-1.5">
                          <div className="flex flex-col">
                            <span>{r.memberName || r.memberId}</span>
                            <span className="text-[10px] text-neutral-500">{r.memberId}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                          {dateText}
                        </td>
                        <td className="px-2 py-1.5 text-[11px]">{reqCi}</td>
                        <td className="px-2 py-1.5 text-[11px]">{reqCo}</td>
                        <td className="px-2 py-1.5 text-[11px] max-w-xs whitespace-pre-wrap">
                          {r.reason || "-"}
                        </td>
                        <td className="px-2 py-1.5 text-[11px]">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleChangeRequestAction(r.id, "approve")}
                              className="rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-600"
                            >
                              承認
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChangeRequestAction(r.id, "reject")}
                              className="rounded-full bg-rose-500 px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-600"
                            >
                              却下
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          {members.length === 0 && !loading && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              この月の勤怠データはまだ登録されていません。
            </div>
          )}

          {members.map((m) => {
            const monthlyText = `${Math.floor(m.monthlyTotalMinutes / 60)}時間${
              m.monthlyTotalMinutes % 60
            }分`;

            return (
              <div
                key={m.memberId}
                className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2 text-sm dark:border-neutral-800">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      {m.memberName || m.memberId}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">member_id: {m.memberId}</p>
                  </div>
                  <div className="text-right text-[11px] text-neutral-600 dark:text-neutral-300">
                    <div>月合計</div>
                    <div className="font-semibold">{monthlyText}</div>
                  </div>
                </div>

                <div className="mt-2 overflow-x-auto">
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
                      {m.records.map((r) => {
                        const dateText = r.workDate
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
                            key={`${m.memberId}-${r.workDate}`}
                            className="border-b border-neutral-100 text-sm last:border-b-0 dark:border-neutral-800"
                          >
                            <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                              {dateText}
                            </td>
                            <td className="px-3 py-2">{clockIn}</td>
                            <td className="px-3 py-2">{clockOut}</td>
                            <td className="px-3 py-2">{totalText}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-xs text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              読み込み中...
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
