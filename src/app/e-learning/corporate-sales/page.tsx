"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY_WATCHED = "learning_portal_watched_videos";
const MAIN_COLOR = "#9e8d70";
const MEMBERS_STORAGE_KEY = "igos_members_v1";

const INSTRUCTORS = {
  hiraga: {
    name: "平賀 翔大",
    title: "代表取締役",
    avatar: "/avatar_photo/avatar_hiraga.jpg",
  },
  takuma: {
    name: "宅間 宗太",
    title: "マネージャー",
    avatar: "/avatar_photo/avatar_takuma.jpg",
  },
  sato: {
    name: "佐藤 翔永",
    title: "マネージャー",
    avatar: "/avatar_photo/avatar_sato.jpg",
  },
} as const;

type Video = {
  id: string;
  title: string;
  category: string;
  url: string;
  description: string;
  sectionId?: number;
  subSection?: string;
  episodeLabel?: string;
  updatedAt?: string;
  durationMinutes?: number;
  instructorKey?: keyof typeof INSTRUCTORS;
  instructorName?: string;
  instructorTitle?: string;
  coverImageUrl?: string;
  instructorAvatarUrl?: string;
  materials?: { label: string; url: string }[];
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

type MemberForDisplay = {
  id: string;
  name: string;
  team?: string;
  role?: string;
  iconUrl?: string;
  active?: boolean;
};

type CorporateSalesChecklist = {
  sheetShared: boolean;
  experiencesWritten: boolean;
};

export default function CorporateSalesTrainingPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [members, setMembers] = useState<MemberForDisplay[]>([]);
  const [corporateSalesChecklist, setCorporateSalesChecklist] =
    useState<CorporateSalesChecklist>({ sheetShared: false, experiencesWritten: false });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_WATCHED);
      if (!raw) return;
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr)) {
        setWatchedSet(new Set(arr));
      }
    } catch (e) {
      console.error("failed to load watched videos", e);
    }
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/e-learning/progress");
        if (!res.ok) return;
        const data = (await res.json()) as {
          corporateSalesChecklist?: Partial<CorporateSalesChecklist>;
        };
        if (data.corporateSalesChecklist) {
          setCorporateSalesChecklist((prev) => ({
            // 一度 true になったものをサーバー側の false で上書きしないようにする
            sheetShared:
              prev.sheetShared ||
              !!data.corporateSalesChecklist?.sheetShared,
            experiencesWritten:
              data.corporateSalesChecklist?.experiencesWritten ?? prev.experiencesWritten,
          }));
        }
      } catch (e) {
        console.error("failed to load corporate sales checklist", e);
      }
    };

    void fetchProgress();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MemberForDisplay[];
      if (Array.isArray(parsed)) {
        const activeMembers = parsed.filter((m) => m && m.name && (m.active ?? true));
        setMembers(activeMembers);
      }
    } catch (e) {
      console.error("failed to load members for e-learning presenter info", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const arr = Array.from(watchedSet);
      window.localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(arr));
    } catch (e) {
      console.error("failed to save watched videos", e);
    }
  }, [watchedSet]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/e-learning/videos");
        if (!res.ok) return;
        const data = (await res.json()) as AdminVideoFromApi[];
        if (!Array.isArray(data)) return;

        const mapped: Video[] = data
          .filter((v) => (v.sectionId ?? 0) === 5)
          .map((v) => {
            const updatedAtDate =
              typeof v.updatedAt === "string" && v.updatedAt.length >= 10
                ? v.updatedAt.slice(0, 10)
                : undefined;

            return {
              id: v.id,
              title: v.title,
              category: v.category ?? "その他",
              url: v.url,
              description: "",
              sectionId: v.sectionId ?? undefined,
              episodeLabel: v.episodeLabel ?? undefined,
              updatedAt: updatedAtDate,
              durationMinutes:
                typeof v.durationMinutes === "number" && v.durationMinutes > 0
                  ? v.durationMinutes
                  : undefined,
              instructorName: v.instructorName ?? undefined,
              coverImageUrl: v.coverImageUrl ?? undefined,
              materials:
                v.materialLabel || v.materialUrl
                  ? [
                      {
                        label: v.materialLabel ?? v.materialUrl ?? "",
                        url: v.materialUrl ?? "",
                      },
                    ]
                  : [],
            };
          });

        setVideos(mapped);
      } catch (e) {
        console.error("failed to fetch corporate sales videos", e);
      }
    };

    void fetchVideos();
  }, []);

  const isSheetShared = corporateSalesChecklist.sheetShared;
  const isExperiencesWritten = corporateSalesChecklist.experiencesWritten;

  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      const ea = a.episodeLabel ?? "";
      const eb = b.episodeLabel ?? "";
      if (ea && eb && ea !== eb) return ea.localeCompare(eb, "ja");
      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      if (da !== db) return da - db;
      return (a.title || "").localeCompare(b.title || "", "ja");
    });
  }, [videos]);

  const saveCorporateSalesChecklist = async (next: CorporateSalesChecklist) => {
    try {
      await fetch("/api/e-learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ corporateSalesChecklist: next }),
      });
    } catch (e) {
      console.error("failed to save corporate sales checklist", e);
    }
  };

  const updateCorporateSalesChecklist = (
    partial: Partial<CorporateSalesChecklist>,
  ) => {
    setCorporateSalesChecklist((prev) => {
      const next = { ...prev, ...partial };
      void saveCorporateSalesChecklist(next);
      return next;
    });
  };

  const openVideo = (video: Video) => {
    setWatchedSet((prev) => new Set(prev).add(video.id));

    void (async () => {
      try {
        await fetch("/api/e-learning/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: video.id }),
        });
      } catch (e) {
        console.error("failed to save progress from corporate sales page", e);
      }
    })();

    if (video.id.startsWith("sec")) {
      router.push(`/videos/${video.id}`);
      return;
    }

    if (typeof window !== "undefined") {
      window.open(video.url, "_blank");
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={() => router.push("/e-learning")}
            className="mb-2 inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            <span>←</span>
            <span>動画研修ラーニングに戻る</span>
          </button>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Skill Up Training
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            法人営業研修
          </h1>
          <p className="mt-2 text-[11px] text-neutral-600 dark:text-neutral-300">
            法人営業の基本的な流れやヒアリングのポイント、提案づくりの考え方などを動画で学ぶ専用ページです。
          </p>
        </header>

        {/* 事前準備チェック：課題スプレッドシート共有 */}
        <section className="mb-5 rounded-xl border border-dashed border-neutral-300 bg-white/80 p-3 text-[11px] shadow-sm dark:border-neutral-700 dark:bg-neutral-900/70">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            Step 0 / Preparation
          </p>
          <h2 className="mt-1 text-[12px] font-semibold text-neutral-900 dark:text-neutral-50">
            課題スプレッドシートを共有する
          </h2>
          <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
            法人営業研修用の課題スプレッドシートは、上長から共有されるものを使用してください。
          </p>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
              checked={isSheetShared}
              onChange={(e) =>
                updateCorporateSalesChecklist({ sheetShared: e.target.checked })
              }
            />
            <span className="text-[11px] text-neutral-700 dark:text-neutral-200">
              課題スプレッドシートの共有が完了しました
            </span>
          </label>
        </section>

        {sorted.length === 0 && (
          <p className="mt-4 text-[11px] text-neutral-500">
            まだ法人営業研修の動画が登録されていません。
          </p>
        )}

        {sorted.length > 0 && (
          <section>
            <h2 className="mb-1 text-xs font-semibold tracking-[0.12em] text-neutral-700 dark:text-neutral-300">
              講座①：法人営業の根本概念（動画）
            </h2>
            <p className="mb-3 text-[10px] text-neutral-500 dark:text-neutral-400">
              この講座では、法人営業の前提となる考え方やスタンスを押さえます。
            </p>
            <div className="relative flex gap-5 overflow-x-auto pb-2">
              {!isSheetShared && (
                <div className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center bg-white/75 text-[11px] font-semibold text-neutral-600 backdrop-blur-sm dark:bg-neutral-900/80 dark:text-neutral-200">
                  まずは上の「研修用スプレッドシートを共有してもらう」を完了してください
                </div>
              )}
              {sorted.map((video) => {
                const isWatched = watchedSet.has(video.id);

                const baseName = video.instructorName || "";
                const member = members.find((m) => m.name === baseName);

                const instructorName = member?.name || baseName;
                const instructorTitle = member?.role || video.instructorTitle || "";
                const instructorAvatar =
                  member?.iconUrl || video.instructorAvatarUrl || "";

                return (
                  <article
                    key={video.id}
                    className="relative flex min-w-[260px] max-w-[320px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white pb-3 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:min-w-[280px] lg:min-w-[300px]"
                  >
                    <button
                      type="button"
                      onClick={() => isSheetShared && openVideo(video)}
                      className="flex flex-1 flex-col text-left"
                      disabled={!isSheetShared}
                    >
                      <div className="relative h-32 w-full bg-neutral-100 dark:bg-neutral-800">
                        {video.coverImageUrl ? (
                          <Image
                            src={video.coverImageUrl}
                            alt={video.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
                            No Thumbnail
                          </div>
                        )}
                        {isWatched && (
                          <div className="absolute left-2 top-2 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                            視聴済み
                          </div>
                        )}
                        {video.episodeLabel && (
                          <div className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {video.episodeLabel}
                          </div>
                        )}
                        {typeof video.durationMinutes === "number" && video.durationMinutes > 0 && (
                          <div className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                            約{video.durationMinutes}分
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col px-3 pt-2">
                        <p className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-50">
                          {video.title}
                        </p>
                        {video.description && (
                          <p className="mt-1 line-clamp-2 text-[10px] text-neutral-600 dark:text-neutral-300">
                            {video.description}
                          </p>
                        )}
                        {(instructorName || instructorTitle) && (
                          <div className="mt-2 flex items-center gap-2">
                            {instructorAvatar && (
                              <div className="h-6 w-6 overflow-hidden rounded-full bg-neutral-200">
                                <Image
                                  src={instructorAvatar}
                                  alt={instructorName || "講師"}
                                  width={24}
                                  height={24}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex flex-col">
                              {instructorName && (
                                <span className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-100">
                                  {instructorName}
                                </span>
                              )}
                              {instructorTitle && (
                                <span className="text-[9px] text-neutral-500 dark:text-neutral-400">
                                  {instructorTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {video.updatedAt && (
                          <p className="mt-1 text-[9px] text-neutral-400 dark:text-neutral-500">
                            最終更新日: {video.updatedAt}
                          </p>
                        )}
                        {video.materials && video.materials.length > 0 && (
                          <div className="mt-2 text-[11px]">
                            <div className="rounded-lg border-l-4 border-[#c4a769] bg-[#fdf7e7] px-3 py-2 dark:border-amber-400 dark:bg-neutral-800/70">
                              <div className="mb-1 flex items-center gap-1.5">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#c4a769] text-[9px] font-bold text-white dark:bg-amber-400 dark:text-neutral-900">
                                  資
                                </span>
                                <p className="text-[10px] font-semibold text-[#4b3b1c] dark:text-neutral-100">
                                  補助資料
                                </p>
                              </div>
                              <ul className="space-y-0.5">
                                {video.materials.map((m, index) => (
                                  <li key={m.url || `${video.id}-material-${index}`}>
                                    {m.url ? (
                                      <a
                                        href={m.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[10px] text-[#6f5a29] underline-offset-2 hover:underline dark:text-amber-200"
                                      >
                                        {m.label}
                                      </a>
                                    ) : (
                                      <span className="text-[10px] text-[#6f5a29] dark:text-amber-200">
                                        {m.label}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                    <div className="mt-2 flex gap-2 px-3 pb-3">
                      <button
                        type="button"
                        onClick={() => isSheetShared && openVideo(video)}
                        disabled={!isSheetShared}
                        className="flex-1 rounded-full bg-[#ad9c79] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#9b8a65]"
                      >
                        動画を開く
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWatchedSet((prev) => {
                            const next = new Set(prev);
                            if (next.has(video.id)) {
                              next.delete(video.id);
                            } else {
                              next.add(video.id);
                            }
                            return next;
                          });
                        }}
                        className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                          isWatched
                            ? "border border-amber-300 bg-amber-50 text-amber-800 shadow-inner"
                            : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
                        }`}
                      >
                        {isWatched ? "未視聴に戻す" : "視聴済みにする"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <div
              className={`mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-700 shadow-sm dark:bg-neutral-900/80 dark:text-neutral-200 ${
                !isSheetShared ? "opacity-60" : ""
              }`}
            >
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                  checked={isExperiencesWritten}
                  disabled={!isSheetShared}
                  onChange={(e) =>
                    updateCorporateSalesChecklist({
                      experiencesWritten: e.target.checked,
                    })
                  }
                />
                <span className="text-[11px] leading-snug">
                  課題スプレッドシートの営業体験の言語化へ最低3つ埋めて、上長に確認をもらいましたか？
                </span>
              </label>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
