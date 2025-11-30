"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// 元 learning-portal と同じ構造のダミーデータ（必要に応じて編集してください）
const LOGIN_PASSWORD = "seekad_learning"; // いまは未使用（パスワード画面なし運用）

const STORAGE_KEY_WATCHED = "learning_portal_watched_videos";
const MAIN_COLOR = "#9e8d70";

function parseEpisodeNumber(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/第(\d+)回/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

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

function inferInstructorKey(name?: string | null): keyof typeof INSTRUCTORS | undefined {
  if (!name) return undefined;
  if (name.includes("平賀")) return "hiraga";
  if (name.includes("宅間")) return "takuma";
  if (name.includes("佐藤")) return "sato";
  return undefined;
}

const VIDEOS: Video[] = [
  {
    id: "sec1-001",
    title: "ラーニングハブの全体像と使い方",
    category: "スタートガイド",
    url: "https://example.com/sec1-001",
    description:
      "長期インターンラーニングハブの目的と全体構造、学び方の流れを説明します。",
    sectionId: 1,
    episodeLabel: "第1回",
    updatedAt: "2025-04-01",
    durationMinutes: 10,
    instructorName: "平賀 翔大",
    instructorTitle: "代表取締役",
    coverImageUrl: "/cover/cover_mkt01.png",
    instructorAvatarUrl: "/avatar_photo/avatar_hiraga.jpg",
    materials: [
      {
        label: "スライド資料（PDF）",
        url: "https://example.com/materials/sec1-001.pdf",
      },
    ],
  },
  {
    id: "sec1-002",
    title: "SEEKAD長期インターン概要と期待役割",
    category: "スタートガイド",
    url: "https://example.com/sec1-002",
    description:
      "SEEKAD長期インターンの全体像と、インターン生に期待する役割・スタンスを解説します。",
    sectionId: 1,
    episodeLabel: "第2回",
    updatedAt: "2025-04-02",
    durationMinutes: 12,
    instructorKey: "takuma",
    materials: [
      {
        label: "インターン概要サマリー（PDF）",
        url: "https://example.com/materials/sec1-002.pdf",
      },
    ],
  },
  {
    id: "sec1-003",
    title: "1ヶ月／3ヶ月成長ロードマップ",
    category: "スタートガイド",
    url: "https://example.com/sec1-003",
    description:
      "インターン開始から1ヶ月・3ヶ月で到達してほしい状態をロードマップ形式で整理します。",
    sectionId: 1,
    episodeLabel: "第3回",
    updatedAt: "2025-04-03",
    durationMinutes: 15,
    instructorName: "教育担当",
    instructorTitle: "インターンプログラム責任者",
  },
  {
    id: "sec2-001",
    title: "Gmail / Slack / Notion / Zoom 初期設定ガイド",
    category: "初期設定",
    url: "https://example.com/sec2-001",
    description:
      "インターン開始前に必ず行う、主要ツールのアカウント設定と基本操作を解説します。",
    sectionId: 2,
    subSection: "A. ツール初期設定",
    episodeLabel: "第1回",
    updatedAt: "2025-04-04",
    durationMinutes: 20,
    instructorName: "情シス担当",
    instructorTitle: "システム管理",
  },
  // 必要に応じて script.js の残りも追記できます
];

export default function ELearningPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "watched" | "unwatched">("all");
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());

  const totalVideoCount = useMemo(() => videos.length, [videos]);
  const totalWatchedCount = useMemo(
    () => videos.filter((v) => watchedSet.has(v.id)).length,
    [videos, watchedSet]
  );

  // localStorage から視聴済み情報を復元
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

  // 視聴済みセットの更新を localStorage に保存
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const arr = Array.from(watchedSet);
      window.localStorage.setItem(STORAGE_KEY_WATCHED, JSON.stringify(arr));
    } catch (e) {
      console.error("failed to save watched videos", e);
    }
  }, [watchedSet]);

  // 初回マウント時に DB(API) から最新の一覧を取得
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/e-learning/videos");
        if (!res.ok) return;
        const data = (await res.json()) as AdminVideoFromApi[];
        if (!Array.isArray(data)) return;

        const mapped: Video[] = data.map((v) => {
          const instructorKey = inferInstructorKey(v.instructorName);
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
            instructorKey,
            instructorName: v.instructorName ?? undefined,
            coverImageUrl: v.coverImageUrl ?? undefined,
            materials:
              v.materialLabel && v.materialUrl
                ? [{ label: v.materialLabel, url: v.materialUrl }]
                : [],
          };
        });

        if (mapped.length > 0) {
          setVideos(mapped);
        }
      } catch (e) {
        console.error("failed to fetch e-learning videos", e);
      }
    };

    void fetchVideos();
  }, []);

  const filteredVideos = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return videos.filter((video) => {
      if (keyword) {
        const text = `${video.title} ${video.description || ""} ${
          video.instructorName || ""
        } ${video.instructorTitle || ""}`.toLowerCase();
        if (!text.includes(keyword)) return false;
      }

      if (category !== "all" && video.category !== category) return false;

      const isWatched = watchedSet.has(video.id);
      if (status === "watched" && !isWatched) return false;
      if (status === "unwatched" && isWatched) return false;

      return true;
    });
  }, [search, category, status, watchedSet, videos]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    videos.forEach((v) => set.add(v.category));
    return Array.from(set).sort();
  }, [videos]);

  const toggleWatched = (id: string) => {
    setWatchedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openVideo = (video: Video) => {
    // sec1-*** などアプリ内の詳細ページが用意されている動画は、内部遷移させる
    if (video.id.startsWith("sec")) {
      router.push(`/videos/${video.id}`);
      setWatchedSet((prev) => new Set(prev).add(video.id));
      return;
    }

    // それ以外は従来どおり外部URLを新規タブで開く
    if (typeof window !== "undefined") {
      window.open(video.url, "_blank");
      setWatchedSet((prev) => new Set(prev).add(video.id));
    }
  };

  // sectionId ごとに、「第◯回」の数字が小さいものが左に来るようにソート
  // episodeLabel が取れない場合のみ、古い順（updatedAt 昇順）→ 新しい順（右側）で並べる
  const sorted = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      const sa = a.sectionId ?? 0;
      const sb = b.sectionId ?? 0;
      if (sa !== sb) return sa - sb;

      const ea = parseEpisodeNumber(a.episodeLabel);
      const eb = parseEpisodeNumber(b.episodeLabel);

      if (ea !== null && eb !== null && ea !== eb) {
        return ea - eb; // 第1回, 第2回, ... の順に並べる
      }

      const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const db = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

      if (da !== db) return da - db; // 古いものが左、新しいものが右

      return (a.title || "").localeCompare(b.title || "");
    });
  }, [filteredVideos]);

  const groupedBySection = useMemo(() => {
    const map = new Map<number, Video[]>();
    sorted.forEach((video) => {
      const id = video.sectionId ?? 0;
      const bucket = map.get(id) ?? [];
      bucket.push(video);
      map.set(id, bucket);
    });
    return map;
  }, [sorted]);

  const getSectionInfo = (sectionId: number) => {
    if (sectionId === 1)
      return {
        title: "セクション1：はじめに（スタートガイド）",
        description:
          "インターン全体像と、このラーニングハブの使い方を理解するための導入セクションです。",
      };
    if (sectionId === 2)
      return {
        title: "セクション2：初期設定・アカウント準備",
        description:
          "業務で使う主要ツールの初期設定や、コミュニケーションの基本ルールを押さえます。",
      };
    return { title: "その他", description: "" };
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Learning Hub
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/elearning-icon.png"
                alt="動画研修ラーニングアイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              動画研修ラーニング
            </h1>
          </div>
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
            インターン生が成果を出すために必要なルール、業務の進め方、学習コンテンツをまとめた動画ポータルです。
          </p>
        </header>

        <section
          className="mb-6 rounded-2xl border border-neutral-200 px-4 py-4 text-xs shadow-sm dark:border-neutral-800"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(56,189,248,0.28), rgba(37,99,235,0.18))",
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Overall Progress
              </p>
              <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                動画研修の全体進捗
              </p>
              <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                いままでに視聴した本数と、全コンテンツに対する完了率のサマリーです。
              </p>
            </div>
            <div className="mt-2 w-full sm:mt-0 sm:max-w-xs">
              <div className="flex items-baseline justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
                <span>
                  視聴済み: <span className="font-semibold text-neutral-900 dark:text-neutral-50">{totalWatchedCount}</span>
                  <span className="mx-0.5">/</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-50">{totalVideoCount}</span> 本
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  {totalVideoCount
                    ? `${Math.round((totalWatchedCount / totalVideoCount) * 100)}% 完了`
                    : "0% 完了"}
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width:
                      totalVideoCount === 0
                        ? "0%"
                        : `${Math.min(
                            100,
                            Math.round((totalWatchedCount / totalVideoCount) * 100)
                          )}%`,
                    backgroundColor: MAIN_COLOR,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mb-6 flex flex-wrap gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-3 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <input
            type="text"
            placeholder="キーワード検索"
            className="min-w-[160px] flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="min-w-[140px] rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">すべてのカテゴリ</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            className="min-w-[140px] rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">すべて</option>
            <option value="unwatched">未視聴のみ</option>
            <option value="watched">視聴済みのみ</option>
          </select>
        </section>

        {sorted.length === 0 && (
          <p className="mt-6 text-xs text-neutral-500">
            条件に合う動画がありません。
          </p>
        )}

        {[...groupedBySection.entries()].map(([sectionId, videos]) => {
          const info = getSectionInfo(sectionId);
          const watchedCount = videos.filter((v) => watchedSet.has(v.id)).length;
          const totalCount = videos.length;
          const percent = totalCount ? Math.round((watchedCount / totalCount) * 100) : 0;

          return (
            <section key={sectionId} className="mb-8 pt-2">
              {sectionId > 0 && (
                <div className="mb-4 border-l-4 pl-3" style={{ borderColor: MAIN_COLOR }}>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {info.title}
                  </h2>
                  {info.description && (
                    <p className="mt-2 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {info.description}
                    </p>
                  )}
                  {totalCount > 0 && (
                    <>
                      <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                        視聴状況: <span className="font-semibold text-neutral-800 dark:text-neutral-100">{watchedCount}</span>
                        <span className="mx-0.5">/</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">{totalCount}</span> 本
                        <span className="ml-2 text-[10px] text-neutral-500 dark:text-neutral-400">({percent}% 完了)</span>
                      </p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: MAIN_COLOR }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-5 overflow-x-auto pb-2">
                {videos.map((video) => {
                  const isWatched = watchedSet.has(video.id);

                  const tpl = video.instructorKey
                    ? INSTRUCTORS[video.instructorKey]
                    : undefined;
                  const instructorName =
                    tpl?.name || video.instructorName || "";
                  const instructorTitle =
                    tpl?.title || video.instructorTitle || "";
                  const instructorAvatar =
                    tpl?.avatar || video.instructorAvatarUrl || "";

                  return (
                    <article
                      key={video.id}
                      className="flex min-w-[260px] max-w-[320px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white pb-3 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:min-w-[280px] lg:min-w-[300px]"
                    >
                      {video.coverImageUrl && (
                        <div className="px-2 pt-3">
                          <img
                            src={video.coverImageUrl}
                            alt={video.title}
                            className="h-40 w-full rounded-lg object-cover"
                          />
                        </div>
                      )}

                      {video.subSection && (
                        <div className="px-4 pt-2.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                          {video.subSection}
                        </div>
                      )}

                      <div className="px-4 pt-2.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {video.title}
                      </div>

                      <div className="flex items-center justify-between px-4 pt-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                          {video.episodeLabel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            isWatched
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isWatched ? "視聴済み" : "未視聴"}
                        </span>
                      </div>

                      <div className="flex items-center justify-end px-4 pt-1 text-[11px] text-neutral-600">
                        <span>
                          {video.durationMinutes && `${video.durationMinutes}分`}
                          {video.updatedAt && ` ・ 更新: ${video.updatedAt}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 px-4 pt-2">
                        {instructorAvatar && (
                          <img
                            src={instructorAvatar}
                            alt={instructorName || "担当者"}
                            className="h-7 w-7 rounded-full border border-neutral-200 object-cover"
                          />
                        )}
                        <div className="flex flex-col leading-tight">
                          <span className="text-[11px] font-semibold text-neutral-900 dark:text-neutral-50">
                            {instructorName}
                          </span>
                          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                            {instructorTitle}
                          </span>
                        </div>
                      </div>

                      <p className="px-4 pt-2 text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-200">
                        {video.description}
                      </p>

                      {video.materials && video.materials.length > 0 && (
                        <div className="px-4 pt-2 text-[11px]">
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
                              {video.materials.map((m) => (
                                <li key={m.url}>
                                  <a
                                    href={m.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-[#6f5a29] underline-offset-2 hover:underline dark:text-amber-200"
                                  >
                                    {m.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex gap-2 px-4 pb-3 pt-1">
                        <button
                          type="button"
                          onClick={() => openVideo(video)}
                          className="flex-1 rounded-full bg-[#ad9c79] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#9b8a65]"
                        >
                          動画を開く
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWatched(video.id)}
                          className="flex-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:border-neutral-400"
                        >
                          {isWatched ? "未視聴に戻す" : "視聴済みにする"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
