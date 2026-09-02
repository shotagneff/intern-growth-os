"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PAGE_MAIN,
  PAGE_INNER,
  INPUT,
  PageHeader,
  SectionCard,
  Kpi,
  PrimaryButton,
} from "@/components/panel";

const SECONDARY_BTN =
  "rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

function parseEpisodeNumber(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/第(\d+)回/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

const INITIAL_VIDEOS = [
  {
    id: "sec1-001",
    title: "ラーニングハブの全体像と使い方",
    category: "スタートガイド",
    url: "https://example.com/sec1-001",
    coverImageUrl: "/cover/cover_mkt01.png",
    sectionId: 1,
    episodeLabel: "第1回",
    updatedAt: "2025-04-01",
    durationMinutes: 10,
    instructorName: "平賀 翔大",
  },
  {
    id: "sec1-002",
    title: "SEEKADメンバー概要と期待役割",
    category: "スタートガイド",
    url: "https://example.com/sec1-002",
    coverImageUrl: "",
    sectionId: 1,
    episodeLabel: "第2回",
    updatedAt: "2025-04-02",
    durationMinutes: 12,
    instructorName: "宅間 宗太",
  },
  {
    id: "sec1-003",
    title: "1ヶ月／3ヶ月成長ロードマップ",
    category: "スタートガイド",
    url: "https://example.com/sec1-003",
    coverImageUrl: "",
    sectionId: 1,
    episodeLabel: "第3回",
    updatedAt: "2025-04-03",
    durationMinutes: 15,
    instructorName: "教育担当",
  },
];

type AdminVideo = (typeof INITIAL_VIDEOS)[number] & {
  materialLabel?: string;
  materialUrl?: string;
  instructorId?: string;
};

type Member = {
  id: string;
  name: string;
  role?: string;
  team?: string;
  iconUrl?: string;
  active: boolean;
};

type ProgressRow = {
  loginId: string;
  displayName: string | null;
  role: string;
  active: boolean;
  watchedCount: number;
  totalVideos: number;
  percent: number;
  perSection: Array<{
    sectionId: number;
    watchedCount: number;
    totalVideos: number;
    percent: number;
  }>;
  lastWatched: {
    videoId: string;
    videoTitle: string | null;
    sectionId: number | null;
    episodeLabel: string | null;
    updatedAt: string;
  } | null;
};

export default function AdminELearningPage() {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [progressRows, setProgressRows] = useState<ProgressRow[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("スタートガイド");
  const [instructorId, setInstructorId] = useState<string>("");
  const [instructorName, setInstructorName] = useState("平賀 翔大");
  const [url, setUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [sectionId, setSectionId] = useState(1);
  const [episodeLabel, setEpisodeLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [materialLabel, setMaterialLabel] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");

  // 初期表示時にサーバーから一覧を取得
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch("/api/e-learning/videos");
        if (!res.ok) return;
        const data = (await res.json()) as AdminVideo[];
        if (Array.isArray(data)) {
          setVideos(data);
        }
      } catch (e) {
        console.error("failed to fetch admin e-learning videos", e);
      }
    };

    fetchVideos();
  }, []);

  useEffect(() => {
    const fetchProgress = async () => {
      setProgressLoading(true);
      try {
        const res = await fetch("/api/admin/e-learning/progress", { cache: "no-store" });
        if (!res.ok) {
          setProgressRows([]);
          return;
        }
        const data = (await res.json()) as ProgressRow[];
        setProgressRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("failed to fetch e-learning progress", e);
        setProgressRows([]);
      } finally {
        setProgressLoading(false);
      }
    };

    void fetchProgress();
  }, []);

  // メンバー一覧を取得（講師選択用）
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Member[];
        if (Array.isArray(data)) {
          const active = data.filter((m) => m.active);
          setMembers(active);
        }
      } catch (e) {
        console.error("failed to fetch members", e);
      }
    };

    void fetchMembers();
  }, []);

  const selectedInstructor = useMemo(() => {
    return members.find((m) => m.id === instructorId);
  }, [members, instructorId]);

  // 講師が未選択なら、メンバーが取れたタイミングで先頭をセット
  useEffect(() => {
    if (instructorId) return;
    if (members.length === 0) return;
    setInstructorId(members[0].id);
    setInstructorName(members[0].name);
  }, [members, instructorId]);

  const membersById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      const sa = a.sectionId ?? 0;
      const sb = b.sectionId ?? 0;
      if (sa !== sb) return sa - sb;

      const ea = parseEpisodeNumber(a.episodeLabel);
      const eb = parseEpisodeNumber(b.episodeLabel);

      if (ea !== null && eb !== null && ea !== eb) {
        return ea - eb; // 第1回, 第2回, ... の順
      }

      return (a.episodeLabel || "").localeCompare(b.episodeLabel || "");
    });
  }, [videos]);

  const handleAddVideo = () => {
    if (!title.trim() || !url.trim()) {
      alert("タイトルとURLは必須です。");
      return;
    }

    const doAdd = async () => {
      const nextIndex = videos.length + 1;
      const generatedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `new-${Date.now()}-${nextIndex}`;
      const newVideo: AdminVideo = {
        id: generatedId,
        title: title.trim(),
        category,
        url: url.trim(),
        coverImageUrl: coverImageUrl.trim(),
        sectionId,
        episodeLabel: episodeLabel.trim() || `第${nextIndex}回`,
        updatedAt: new Date().toISOString().slice(0, 10),
        durationMinutes: durationMinutes === "" ? 0 : Number(durationMinutes),
        instructorId: instructorId || undefined,
        instructorName: selectedInstructor?.name || instructorName,
        materialLabel: materialLabel.trim() || undefined,
        materialUrl: materialUrl.trim() || undefined,
      };

      try {
        const res = await fetch("/api/e-learning/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newVideo),
        });
        if (!res.ok) {
          console.error("failed to save new video", await res.text());
          return;
        }
        setVideos((prev) => [...prev, newVideo]);
        resetForm();
      } catch (e) {
        console.error("failed to save new video", e);
      }
    };

    void doAdd();
  };

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setCoverImageUrl("");
    setEpisodeLabel("");
    setDurationMinutes("");
    setSectionId(1);
    setCategory("スタートガイド");
    setInstructorId(members[0]?.id ?? "");
    setInstructorName(members[0]?.name ?? "平賀 翔大");
    setMaterialLabel("");
    setMaterialUrl("");
    setEditingId(null);
  };

  const handleStartEdit = (video: AdminVideo) => {
    setEditingId(video.id);
    setTitle(video.title ?? "");
    setCategory(video.category ?? "スタートガイド");
    const byId = video.instructorId ? membersById.get(video.instructorId) : undefined;
    const byName =
      !video.instructorId && video.instructorName
        ? members.find((m) => m.name === video.instructorName)
        : undefined;
    const resolvedId = byId?.id || byName?.id || "";
    setInstructorId(resolvedId);
    setInstructorName(
      byId?.name || byName?.name || video.instructorName || "平賀 翔大"
    );
    setUrl(video.url ?? "");
    setCoverImageUrl(video.coverImageUrl ?? "");
    setSectionId(video.sectionId ?? 1);
    setEpisodeLabel(video.episodeLabel ?? "");
    setDurationMinutes(
      typeof video.durationMinutes === "number" ? video.durationMinutes : ""
    );
    setMaterialLabel(video.materialLabel ?? "");
    setMaterialUrl(video.materialUrl ?? "");
  };

  const handleUpdateVideo = () => {
    if (!editingId) {
      handleAddVideo();
      return;
    }

    if (!title.trim() || !url.trim()) {
      alert("タイトルとURLは必須です。");
      return;
    }

    const doUpdate = async () => {
      const updatedAt = new Date().toISOString().slice(0, 10);

      const payload = {
        id: editingId,
        title: title.trim(),
        category,
        instructorId: instructorId || undefined,
        instructorName: selectedInstructor?.name || instructorName,
        url: url.trim(),
        coverImageUrl: coverImageUrl.trim(),
        sectionId,
        episodeLabel: episodeLabel.trim(),
        durationMinutes: durationMinutes === "" ? 0 : Number(durationMinutes),
        materialLabel: materialLabel.trim() || undefined,
        materialUrl: materialUrl.trim() || undefined,
        updatedAt,
      };

      try {
        const res = await fetch("/api/e-learning/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          console.error("failed to update video", await res.text());
          return;
        }

        setVideos((prev) =>
          prev.map((v) =>
            v.id === editingId
              ? {
                  ...v,
                  title: payload.title,
                  category: payload.category,
                  instructorId: payload.instructorId,
                  instructorName: payload.instructorName,
                  url: payload.url,
                  coverImageUrl: payload.coverImageUrl,
                  sectionId: payload.sectionId,
                  episodeLabel: payload.episodeLabel || v.episodeLabel || "",
                  durationMinutes: payload.durationMinutes,
                  materialLabel: payload.materialLabel,
                  materialUrl: payload.materialUrl,
                  updatedAt,
                }
              : v
          )
        );

        resetForm();
      } catch (e) {
        console.error("failed to update video", e);
      }
    };

    void doUpdate();
  };

  const handleDeleteVideo = (id: string) => {
    const target = videos.find((v) => v.id === id);
    if (!target) return;

    const ok = window.confirm(
      `「${target.title}」を削除しますか？` +
        "\n※ この画面上の一覧からのみ削除されます（サーバー保存はまだ行っていません）。"
    );
    if (!ok) return;

    const doDelete = async () => {
      try {
        const res = await fetch(`/api/e-learning/videos?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          console.error("failed to delete video", await res.text());
          return;
        }

        setVideos((prev) => prev.filter((v) => v.id !== id));

        if (editingId === id) {
          resetForm();
        }
      } catch (e) {
        console.error("failed to delete video", e);
      }
    };

    void doDelete();
  };

  const labelClass = "text-xs font-medium text-neutral-600 dark:text-neutral-300";

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="Admin / Video Learning"
          title="動画研修ラーニング（管理）"
          description="動画コンテンツの追加・編集・削除と、ユーザーごとの視聴状況を管理するビューです。"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="登録動画数" value={videos.length} hint="この画面で管理している動画" />
          <Kpi label="集計対象ユーザー" value={progressRows.length} hint="視聴データのあるユーザー" />
          <Kpi label="講師候補" value={members.length} hint="有効なメンバー" />
        </div>

        <SectionCard
          title="視聴完了率（ユーザー別）"
          description="ユーザーごとの「視聴済み本数 / 全動画本数」を表示します。"
          action={
            <button
              type="button"
              onClick={() => {
                const refresh = async () => {
                  setProgressLoading(true);
                  try {
                    const res = await fetch("/api/admin/e-learning/progress", { cache: "no-store" });
                    if (!res.ok) {
                      setProgressRows([]);
                      return;
                    }
                    const data = (await res.json()) as ProgressRow[];
                    setProgressRows(Array.isArray(data) ? data : []);
                  } finally {
                    setProgressLoading(false);
                  }
                };

                void refresh();
              }}
              className={`${SECONDARY_BTN} disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={progressLoading}
            >
              再読み込み
            </button>
          }
        >
          {progressLoading && (
            <p className="text-xs text-neutral-500">読み込み中...</p>
          )}

          {progressRows.length === 0 && !progressLoading ? (
            <p className="text-xs text-neutral-500">まだ視聴データがありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                    <th className="px-3 py-2 text-left">ログインID</th>
                    <th className="px-3 py-2 text-left">名前</th>
                    <th className="px-3 py-2 text-left">権限</th>
                    <th className="px-3 py-2 text-left">状態</th>
                    <th className="px-3 py-2 text-right">視聴済み</th>
                    <th className="px-3 py-2 text-right">全体</th>
                    <th className="px-3 py-2 text-left">セクション別</th>
                    <th className="px-3 py-2 text-left">最終視聴</th>
                  </tr>
                </thead>
                <tbody>
                  {progressRows.map((r) => (
                    <tr
                      key={r.loginId}
                      className="border-b border-neutral-100 text-neutral-700 last:border-0 dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <td className="px-3 py-2 align-top font-semibold text-neutral-900 dark:text-neutral-50">
                        {r.loginId}
                      </td>
                      <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                        {r.displayName || "-"}
                      </td>
                      <td className="px-3 py-2 align-top">{r.role}</td>
                      <td className="px-3 py-2 align-top">{r.active ? "active" : "inactive"}</td>
                      <td className="px-3 py-2 align-top text-right tabular-nums">
                        {r.watchedCount} / {r.totalVideos}
                      </td>
                      <td className="px-3 py-2 align-top text-right tabular-nums">
                        {r.percent}%
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(r.perSection ?? []).map((s) => (
                            <span
                              key={s.sectionId}
                              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                            >
                              Sec{s.sectionId}:{" "}
                              <span className="tabular-nums">{s.percent}%</span>
                              <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                                ({s.watchedCount}/{s.totalVideos})
                              </span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-[10px] text-neutral-600 dark:text-neutral-300">
                        {r.lastWatched ? (
                          <div className="max-w-[320px]">
                            <div className="truncate">
                              {r.lastWatched.sectionId ? `Sec ${r.lastWatched.sectionId} ` : ""}
                              {r.lastWatched.episodeLabel ? `${r.lastWatched.episodeLabel} ` : ""}
                              {r.lastWatched.videoTitle || r.lastWatched.videoId}
                            </div>
                            <div className="mt-0.5 tabular-nums text-neutral-500 dark:text-neutral-400">
                              {new Date(r.lastWatched.updatedAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={editingId ? "動画を編集" : "新しい動画を追加"}
          description="必要項目を入力して「一覧に追加」すると、下のテーブルに1行追加されます（ブラウザを更新するとリセットされます）。"
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>タイトル *</label>
              <input
                className={INPUT}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：ラーニングハブの全体像と使い方"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>カテゴリ *</label>
              <select
                className={INPUT}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="スタートガイド">スタートガイド</option>
                <option value="初期設定">初期設定</option>
                <option value="実務基礎">実務基礎</option>
                <option value="思考法">思考法</option>
                <option value="マーケティング基礎">マーケティング基礎</option>
                <option value="営業基礎">営業基礎</option>
                <option value="サービス別実務">サービス別実務</option>
                <option value="営業応用">営業応用</option>
                <option value="マーケティング実務">マーケティング実務</option>
                <option value="報酬・評価">報酬・評価</option>
                <option value="その他">その他</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>講師 *</label>
              <select
                className={INPUT}
                value={instructorId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setInstructorId(nextId);
                  const next = membersById.get(nextId);
                  if (next) setInstructorName(next.name);
                }}
              >
                {members.length > 0 ? (
                  members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <option value="">（メンバー未取得）</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>URL *</label>
              <input
                className={INPUT}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2 lg:col-span-1">
              <label className={labelClass}>カバー画像URL</label>
              <input
                className={INPUT}
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="/cover/xxx.png または https://..."
              />
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                画像は Next.js の public 配下のパスを指定してください（例：/images/avatars/avatar_hiraga.jpg や /images/banners/training-banners/intern-onboarding-01.png と指定してください）。外部URL（https://...）を使うこともできます。
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>セクションID *</label>
              <input
                type="number"
                min={1}
                className={INPUT}
                value={sectionId}
                onChange={(e) => setSectionId(Number(e.target.value) || 1)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>第◯回ラベル</label>
              <select
                className={INPUT}
                value={episodeLabel}
                onChange={(e) => setEpisodeLabel(e.target.value)}
              >
                <option value="">自動採番（未指定）</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={`第${n}回`}>
                    第{n}回
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>時間（分）</label>
              <input
                type="number"
                min={0}
                className={INPUT}
                value={durationMinutes}
                onChange={(e) => {
                  const value = e.target.value;
                  setDurationMinutes(value === "" ? "" : Number(value));
                }}
                placeholder="例：15"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>補助資料タイトル</label>
              <input
                className={INPUT}
                value={materialLabel}
                onChange={(e) => setMaterialLabel(e.target.value)}
                placeholder="例：スライド資料（PDF）"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>補助資料URL</label>
              <input
                className={INPUT}
                value={materialUrl}
                onChange={(e) => setMaterialUrl(e.target.value)}
                placeholder="例：https://example.com/materials/xxx.pdf"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className={SECONDARY_BTN}
              >
                編集をキャンセル
              </button>
            )}
            <PrimaryButton type="button" onClick={handleUpdateVideo}>
              {editingId ? "内容を更新" : "一覧に追加"}
            </PrimaryButton>
          </div>
        </SectionCard>

        <SectionCard
          title="動画コンテンツ一覧"
          description="いまはコード内のダミーデータ＋この画面から追加したデータを表示しています。サーバー保存はまだ行っていません。"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
                  <th className="px-3 py-2 text-left">カバー</th>
                  <th className="px-3 py-2 text-left">セクション</th>
                  <th className="px-3 py-2 text-left">回</th>
                  <th className="px-3 py-2 text-left">タイトル</th>
                  <th className="px-3 py-2 text-left">講師</th>
                  <th className="px-3 py-2 text-left">時間</th>
                  <th className="px-3 py-2 text-left">最終更新</th>
                  <th className="px-3 py-2 text-left">URL</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-neutral-100 text-[11px] text-neutral-700 last:border-0 hover:bg-neutral-50/80 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    <td className="px-3 py-2 align-top">
                      {v.coverImageUrl ? (
                        <img
                          src={v.coverImageUrl}
                          alt={v.title}
                          className="h-10 w-16 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                      ) : (
                        <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-dashed border-neutral-200 text-[9px] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                          なし
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                        Sec {v.sectionId}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">{v.episodeLabel}</td>
                    <td className="px-3 py-2 align-top font-semibold text-neutral-900 dark:text-neutral-50">
                      {v.title}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                      {v.instructorId
                        ? membersById.get(v.instructorId)?.name || v.instructorName
                        : v.instructorName}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                      {v.durationMinutes ? `${v.durationMinutes}分` : "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                      {v.updatedAt || "-"}
                    </td>
                    <td className="px-3 py-2 align-top max-w-[180px] truncate text-sky-600 underline underline-offset-2 dark:text-sky-400">
                      {v.url}
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(v)}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[10px] font-semibold text-neutral-600 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(v.id)}
                          className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[10px] font-semibold text-neutral-600 shadow-sm hover:border-red-300 hover:text-red-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
