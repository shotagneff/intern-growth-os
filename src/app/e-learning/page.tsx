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

type Section2Checklist = {
  survey: boolean;
  contract: boolean;
  line: boolean;
  prokin: boolean;
};

type Section3Checklist = {
  asanaPcMobile: boolean;
  asanaFixedTask: boolean;
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
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [section2Checklist, setSection2Checklist] = useState<Section2Checklist>({
    survey: false,
    contract: false,
    line: false,
    prokin: false,
  });
  const [section3Checklist, setSection3Checklist] = useState<Section3Checklist>({
    asanaPcMobile: false,
    asanaFixedTask: false,
  });

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

  // ログインユーザーの進捗をサーバーから取得して反映
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch("/api/e-learning/progress");
        if (!res.ok) return;
        const data = (await res.json()) as {
          watchedVideoIds?: string[];
          section2Checklist?: Partial<Section2Checklist>;
          section3Checklist?: Partial<Section3Checklist>;
        };
        if (Array.isArray(data.watchedVideoIds)) {
          setWatchedSet(new Set(data.watchedVideoIds));
        }
        if (data.section2Checklist) {
          setSection2Checklist((prev) => ({
            survey: data.section2Checklist?.survey ?? prev.survey,
            contract: data.section2Checklist?.contract ?? prev.contract,
            line: data.section2Checklist?.line ?? prev.line,
            prokin: data.section2Checklist?.prokin ?? prev.prokin,
          }));
        }
        if (data.section3Checklist) {
          setSection3Checklist((prev) => ({
            asanaPcMobile: data.section3Checklist?.asanaPcMobile ?? prev.asanaPcMobile,
            asanaFixedTask:
              data.section3Checklist?.asanaFixedTask ?? prev.asanaFixedTask,
          }));
        }
      } catch (e) {
        console.error("failed to load progress", e);
      }
    };

    void fetchProgress();
  }, []);

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

        if (mapped.length > 0) {
          setVideos(mapped);
        }
      } catch (e) {
        console.error("failed to fetch e-learning videos", e);
      }
    };

    void fetchVideos();
  }, []);

  const toggleWatched = (id: string) => {
    setWatchedSet((prev) => {
      const next = new Set(prev);
      const wasWatched = next.has(id);

      if (wasWatched) {
        next.delete(id);
      } else {
        next.add(id);

        // 「視聴済みにする」にしたときだけサーバーにも保存
        void (async () => {
          try {
            await fetch("/api/e-learning/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId: id }),
            });
          } catch (e) {
            console.error("failed to save progress from toggle", e);
          }
        })();
      }

      return next;
    });
  };

  const saveSection3Checklist = async (next: Section3Checklist) => {
    try {
      await fetch("/api/e-learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section3Checklist: next }),
      });
    } catch (e) {
      console.error("failed to save section3 checklist", e);
    }
  };

  const updateSection3Checklist = (partial: Partial<Section3Checklist>) => {
    setSection3Checklist((prev) => {
      const next = { ...prev, ...partial };
      void saveSection3Checklist(next);
      return next;
    });
  };

  const openVideo = (video: Video) => {
    // ローカル状態を即時更新
    setWatchedSet((prev) => new Set(prev).add(video.id));

    // サーバー側進捗を非同期で更新（エラーはUIには反映しない）
    void (async () => {
      try {
        await fetch("/api/e-learning/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId: video.id }),
        });
      } catch (e) {
        console.error("failed to save progress", e);
      }
    })();

    // sec1-*** などアプリ内の詳細ページが用意されている動画は、内部遷移させる
    if (video.id.startsWith("sec")) {
      router.push(`/videos/${video.id}`);
      return;
    }

    // それ以外は従来どおり外部URLを新規タブで開く
    if (typeof window !== "undefined") {
      window.open(video.url, "_blank");
    }
  };

  const saveSection2Checklist = async (next: Section2Checklist) => {
    try {
      await fetch("/api/e-learning/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section2Checklist: next }),
      });
    } catch (e) {
      console.error("failed to save section2 checklist", e);
    }
  };

  const updateSection2Checklist = (partial: Partial<Section2Checklist>) => {
    setSection2Checklist((prev) => {
      const next = { ...prev, ...partial };
      void saveSection2Checklist(next);
      return next;
    });
  };

  // sectionId ごとに、「第◯回」の数字が小さいものが左に来るようにソート
  // episodeLabel が取れない場合のみ、古い順（updatedAt 昇順）→ 新しい順（右側）で並べる
  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
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
  }, [videos]);

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

  // セクションごとの並び順とロック判定
  const sectionOrder = useMemo(() => {
    return [...groupedBySection.keys()].sort((a, b) => a - b);
  }, [groupedBySection]);

  const isSectionUnlocked = (sectionId: number) => {
    if (sectionOrder.length === 0) return true;
    const idx = sectionOrder.indexOf(sectionId);
    if (idx <= 0) return true; // 最初のセクションは常に解放

    const prevId = sectionOrder[idx - 1];
    const prevVideos = groupedBySection.get(prevId) ?? [];
    if (prevVideos.length === 0) return true;

    const prevCompleted = prevVideos.every((v) => watchedSet.has(v.id));
    if (!prevCompleted) return false;

    // セクション3は「セクション2の動画＋チェックリスト完了」で解放
    if (sectionId === 3) {
      const checklistDone2 =
        section2Checklist.survey &&
        section2Checklist.contract &&
        section2Checklist.line &&
        section2Checklist.prokin;
      return checklistDone2;
    }

    // セクション4は「セクション3の動画＋Asanaチェックリスト完了」で解放
    if (sectionId === 4) {
      const checklistDone3 =
        section3Checklist.asanaPcMobile && section3Checklist.asanaFixedTask;
      return checklistDone3;
    }

    return true;
  };

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
        description: "業務で使う主要ツールの初期設定を行います",
      };
    if (sectionId === 3)
      return {
        title: "セクション3：日々の業務のポイント",
        description:
          "日常の業務におけるポイントや気を付けるべき点を解説します。",
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
        {videos.length === 0 && (
          <p className="mt-6 text-xs text-neutral-500">
            まだ動画が登録されていません。
          </p>
        )}

        {[...groupedBySection.entries()].map(([sectionId, videos]) => {
          const info = getSectionInfo(sectionId);
          const watchedCount = videos.filter((v) => watchedSet.has(v.id)).length;
          const totalCount = videos.length;
          const percent = totalCount ? Math.round((watchedCount / totalCount) * 100) : 0;
          const unlocked = isSectionUnlocked(sectionId);

          return (
            <section key={sectionId} className="mb-8 pt-2">
              {sectionId > 0 && (
                <div className="mb-4 border-l-4 pl-3" style={{ borderColor: MAIN_COLOR }}>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {info.title}
                  </h2>
                  {info.description && (
                    <p className="mt-2 text-xs sm:text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {info.description}
                    </p>
                  )}
                  {sectionId === 2 && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-2 text-[11px] text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        完了チェックリスト
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        以下の4つをすべて完了すると、セクション3が解放されます。
                      </p>
                      <div className="mt-1 space-y-1.5">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section2Checklist.survey}
                            onChange={(e) =>
                              updateSection2Checklist({ survey: e.target.checked })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            Googleアンケートを回答して提出したか
                          </span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section2Checklist.contract}
                            onChange={(e) =>
                              updateSection2Checklist({ contract: e.target.checked })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            契約書を締結したか
                          </span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section2Checklist.line}
                            onChange={(e) =>
                              updateSection2Checklist({ line: e.target.checked })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            長期インターンLINEグループへ参加して意気込みを投稿できたか
                          </span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section2Checklist.prokin}
                            onChange={(e) =>
                              updateSection2Checklist({ prokin: e.target.checked })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            プロ勤にログインして出勤できたか
                          </span>
                        </label>
                      </div>
                    </div>
                  )}
                  {sectionId === 3 && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-dashed border-neutral-300 bg-white/70 px-3 py-2 text-[11px] text-neutral-700 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-200">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                        完了チェックリスト
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                        以下の2つを完了すると、次のセクション（セクション4）が解放されます。
                      </p>
                      <div className="mt-1 space-y-1.5">
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section3Checklist.asanaPcMobile}
                            onChange={(e) =>
                              updateSection3Checklist({
                                asanaPcMobile: e.target.checked,
                              })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            asanaへPC、スマホからアクセスできましたか？
                          </span>
                        </label>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-[2px] h-3.5 w-3.5 rounded border-neutral-300 text-[#ad9c79] focus:ring-0"
                            checked={section3Checklist.asanaFixedTask}
                            onChange={(e) =>
                              updateSection3Checklist({
                                asanaFixedTask: e.target.checked,
                              })
                            }
                          />
                          <span className="text-[11px] leading-snug">
                            出勤日用の『出勤・日報』タスクは、Asanaの固定曜日タスクに設定済みですか？
                          </span>
                        </label>
                      </div>
                    </div>
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
                  {!unlocked && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      直前のセクションをすべて視聴すると、このセクションが解放されます。
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-5 overflow-x-auto pb-2">
                {videos.map((video) => {
                  const isWatched = watchedSet.has(video.id);

                  const isDetailTypeVideo =
                    video.sectionId === 2 &&
                    (video.title.includes("契約書の締結について") ||
                      video.title.includes("LINEグループの参加") ||
                      video.title.includes("インターン登録フォームの提出"));

                  const isProkinSiteVideo = video.title.includes("プロ勤の使い方について");

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
                      className={`relative flex min-w-[260px] max-w-[320px] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white pb-3 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 sm:min-w-[280px] lg:min-w-[300px] ${
                        !unlocked ? "opacity-60" : ""
                      }`}
                    >
                      {!unlocked && (
                        <div className="absolute left-2 top-2 z-10 inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                          <span className="mr-1">🔒</span>
                          <span>LOCKED</span>
                        </div>
                      )}
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

                      <div className="mt-2 flex gap-2 px-4 pb-3 pt-1">
                        <button
                          type="button"
                          onClick={() => openVideo(video)}
                          disabled={!unlocked}
                          className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm ${
                            unlocked
                              ? "bg-[#ad9c79] hover:bg-[#9b8a65]"
                              : "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                          }`}
                        >
                          {unlocked
                            ? isProkinSiteVideo
                              ? "プロ勤のサイトはこちら"
                              : isDetailTypeVideo
                                ? "詳細を確認する"
                                : "動画を開く"
                            : "ロック中"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWatched(video.id)}
                          className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition
                            ${isWatched
                              ? "border border-amber-300 bg-amber-50 text-amber-800 shadow-inner"
                              : "border border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"}
                          `}
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
