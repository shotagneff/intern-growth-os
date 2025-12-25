"use client";

import { useEffect, useMemo, useState } from "react";

const MAIN_COLOR = "#9e8d70";

type AdminUserProgress = {
  id: string;
  memberId: string;
  name: string | null;
  watchedVideoIds: string[];
};

type AdminVideoFromApi = {
  id: string;
  title: string;
  category?: string | null;
  url: string;
  coverImageUrl?: string | null;
  sectionId?: number | null;
  episodeLabel?: string | null;
  durationMinutes?: number | null;
  instructorName?: string | null;
  materialLabel?: string | null;
  materialUrl?: string | null;
  updatedAt?: string | null;
};

function parseEpisodeNumber(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/第(\d+)回/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

export default function AdminELearningProgressPage() {
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserProgress[]>([]);
  const [videos, setVideos] = useState<AdminVideoFromApi[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [progressRes, videosRes] = await Promise.all([
          fetch("/api/admin/e-learning/progress"),
          fetch("/api/e-learning/videos"),
        ]);

        if (progressRes.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        if (!progressRes.ok) {
          setError("進捗データの取得に失敗しました");
          setLoading(false);
          return;
        }

        const progressData = (await progressRes.json()) as { users?: AdminUserProgress[] };
        if (Array.isArray(progressData.users)) {
          setUsers(progressData.users);
        }

        if (videosRes.ok) {
          const videosData = (await videosRes.json()) as AdminVideoFromApi[];
          if (Array.isArray(videosData)) {
            setVideos(videosData);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error("failed to load admin e-learning progress", e);
        setError("進捗データの取得に失敗しました");
        setLoading(false);
      }
    };

    void fetchAll();
  }, []);

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      const sa = a.sectionId ?? 0;
      const sb = b.sectionId ?? 0;
      if (sa !== sb) return sa - sb;

      const ea = parseEpisodeNumber(a.episodeLabel);
      const eb = parseEpisodeNumber(b.episodeLabel);

      if (ea !== null && eb !== null && ea !== eb) {
        return ea - eb;
      }

      return (a.episodeLabel || "").localeCompare(b.episodeLabel || "");
    });
  }, [videos]);

  const videosBySection = useMemo(() => {
    const map = new Map<number, AdminVideoFromApi[]>();
    for (const v of sortedVideos) {
      const sid = v.sectionId ?? 0;
      const arr = map.get(sid) ?? [];
      arr.push(v);
      map.set(sid, arr);
    }
    return map;
  }, [sortedVideos]);

  const sectionOrder = useMemo(() => {
    return [...videosBySection.keys()].sort((a, b) => a - b);
  }, [videosBySection]);

  const getSectionTitle = (sectionId: number) => {
    if (sectionId === 1) return "セクション1";
    if (sectionId === 2) return "セクション2";
    if (sectionId === 3) return "セクション3";
    if (sectionId === 4) return "セクション4";
    return `その他(${sectionId})`;
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-xs text-neutral-500">進捗データを読み込み中...</p>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          このページにアクセスする権限がありません。
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Admin / Video Learning
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            動画研修ラーニング進捗（全員分）
          </h1>
          <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
            各セクション内の動画ごとに、誰が視聴済みかを一覧で確認できます。
          </p>
          {error && (
            <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </header>

        {users.length === 0 && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            ユーザーがまだ登録されていません。
          </p>
        )}

        {sectionOrder.map((sectionId) => {
          const sectionVideos = videosBySection.get(sectionId) ?? [];
          if (sectionVideos.length === 0) return null;

          return (
            <section key={sectionId} className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {getSectionTitle(sectionId)} の進捗
                  </h2>
                  <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                    各動画ごとに、視聴済みかどうかをチェックできます。
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                      <th className="sticky left-0 z-10 bg-neutral-50 px-3 py-2 text-left dark:bg-neutral-900">
                        ユーザー
                      </th>
                      {sectionVideos.map((v) => (
                        <th key={v.id} className="px-3 py-2 text-left">
                          <div className="max-w-[140px] whitespace-normal text-[10px] font-semibold text-neutral-700 dark:text-neutral-200">
                            {v.title}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                          <td className="sticky left-0 z-10 bg-white px-3 py-1.5 align-top text-[11px] text-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-100">
                            <div className="font-semibold">{u.name || u.memberId}</div>
                            <div className="text-[10px] text-neutral-500">{u.memberId}</div>
                          </td>
                          {sectionVideos.map((v) => {
                            const watched = u.watchedVideoIds?.includes(v.id);
                            return (
                              <td
                                key={v.id}
                                className="px-3 py-1.5 align-middle text-center text-[11px]"
                              >
                                <span
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                                    watched
                                      ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-neutral-900"
                                      : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                                  }`}
                                >
                                  {watched ? "✓" : "-"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
