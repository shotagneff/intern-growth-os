"use client";

import { useMemo, useState } from "react";

const MAIN_COLOR = "#9e8d70";

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
    title: "SEEKAD長期インターン概要と期待役割",
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

type AdminVideo = (typeof INITIAL_VIDEOS)[number];

export default function AdminELearningPage() {
  const [videos, setVideos] = useState<AdminVideo[]>(INITIAL_VIDEOS);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("スタートガイド");
  const [instructorName, setInstructorName] = useState("平賀 翔大");
  const [url, setUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [sectionId, setSectionId] = useState(1);
  const [episodeLabel, setEpisodeLabel] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");

  const sorted = useMemo(() => {
    return [...videos].sort((a, b) => {
      const sa = a.sectionId ?? 0;
      const sb = b.sectionId ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.episodeLabel || "").localeCompare(b.episodeLabel || "");
    });
  }, [videos]);

  const handleAddVideo = () => {
    if (!title.trim() || !url.trim()) {
      alert("タイトルとURLは必須です。");
      return;
    }

    setVideos((prev) => {
      const nextIndex = prev.length + 1;
      const newVideo: AdminVideo = {
        id: `new-${nextIndex}`,
        title: title.trim(),
        category,
        url: url.trim(),
        coverImageUrl: coverImageUrl.trim(),
        sectionId,
        episodeLabel: episodeLabel.trim() || `第${nextIndex}回`,
        updatedAt: new Date().toISOString().slice(0, 10),
        durationMinutes: durationMinutes === "" ? 0 : Number(durationMinutes),
        instructorName,
      };
      return [...prev, newVideo];
    });

    setTitle("");
    setUrl("");
    setCoverImageUrl("");
    setEpisodeLabel("");
    setDurationMinutes("");
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Admin / Video Learning
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            動画研修ラーニング（管理）
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            動画コンテンツの一覧を管理者向けに確認するビューです。今後、ここから追加・編集・削除ができるように拡張していきます。
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              新しい動画を追加
            </h2>
            <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
              必要項目を入力して「一覧に追加」すると、下のテーブルに1行追加されます（ブラウザを更新するとリセットされます）。
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">タイトル *</label>
                <input
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：ラーニングハブの全体像と使い方"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">カテゴリ *</label>
                <select
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
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

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">講師 *</label>
                <select
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                >
                  <option value="平賀 翔大">平賀 翔大</option>
                  <option value="宅間 宗太">宅間 宗太</option>
                  <option value="佐藤 翔永">佐藤 翔永</option>
                  <option value="教育担当">教育担当</option>
                  <option value="その他">その他</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">URL *</label>
                <input
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">カバー画像URL</label>
                <input
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="/cover/xxx.png または https://..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">セクションID *</label>
                <input
                  type="number"
                  min={1}
                  className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={sectionId}
                  onChange={(e) => setSectionId(Number(e.target.value) || 1)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">第◯回ラベル</label>
                <select
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
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

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">時間（分）</label>
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-md border border-neutral-300 bg-white px-2 py-1 text-[11px] outline-none focus:ring dark:border-neutral-700 dark:bg-neutral-900"
                  value={durationMinutes}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDurationMinutes(value === "" ? "" : Number(value));
                  }}
                  placeholder="例：15"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleAddVideo}
                className="rounded-full px-4 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:opacity-90"
                style={{ backgroundColor: MAIN_COLOR }}
              >
                一覧に追加
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                動画コンテンツ一覧
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                いまはコード内のダミーデータ＋この画面から追加したデータを表示しています。サーバー保存はまだ行っていません。
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                  <th className="px-3 py-2 text-left">カバー</th>
                  <th className="px-3 py-2 text-left">セクション</th>
                  <th className="px-3 py-2 text-left">回</th>
                  <th className="px-3 py-2 text-left">タイトル</th>
                  <th className="px-3 py-2 text-left">カテゴリ</th>
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
                          className="h-10 w-16 rounded object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                      ) : (
                        <div className="flex h-10 w-16 items-center justify-center rounded border border-dashed border-neutral-200 text-[9px] text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
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
                      {v.category}
                    </td>
                    <td className="px-3 py-2 align-top text-neutral-600 dark:text-neutral-300">
                      {v.instructorName}
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
                          disabled
                          className="rounded-full border border-neutral-300 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-600 shadow-sm hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          編集（準備中）
                        </button>
                        <button
                          type="button"
                          disabled
                          className="rounded-full border border-neutral-300 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-600 shadow-sm hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          削除（準備中）
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
