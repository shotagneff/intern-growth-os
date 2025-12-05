"use client";

import React, { useEffect, useState } from "react";

type ScheduledPost = {
  id: number;
  userId: string;
  text: string;
  scheduledAt: string | null;
  status: string;
  postedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ThreadsScheduledPostsPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/threads/scheduled-posts", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "一覧の取得に失敗しました");
        return;
      }
      const data = (await res.json()) as { posts: ScheduledPost[] };
      setPosts(data.posts);
    } catch (e) {
      console.error(e);
      setError("一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPosts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("テキストは必須です");
      return;
    }

    try {
      const res = await fetch("/api/threads/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, scheduledAt: scheduledAt || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "作成に失敗しました");
        return;
      }

      setText("");
      setScheduledAt("");
      await fetchPosts();
    } catch (e) {
      console.error(e);
      setError("作成に失敗しました");
    }
  };

  const handleDummyPost = async (id: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/threads/scheduled-posts/${id}/dummy-post`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "ダミー投稿に失敗しました");
        return;
      }
      await fetchPosts();
    } catch (e) {
      console.error(e);
      setError("ダミー投稿に失敗しました");
    }
  };

  const handlePostNowToThreads = async (text: string) => {
    setError(null);
    try {
      const res = await fetch("/api/threads/post-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Threads への即時投稿に失敗しました");
        return;
      }
    } catch (e) {
      console.error(e);
      setError("Threads への即時投稿に失敗しました");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Threads 予約投稿管理（Step1 / ダミー）
      </h1>

      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        ここでは Threads API にはまだ接続せず、予約投稿レコードの管理と「ダミー投稿（コンソール出力）」のみ行います。
      </p>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          新規予約投稿の作成
        </h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              テキスト
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[100px] w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200">
              予約日時（任意）
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              予約投稿を追加
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            予約投稿一覧
          </h2>
          <button
            type="button"
            onClick={() => void fetchPosts()}
            className="inline-flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            再読み込み
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300">まだ予約投稿はありません。</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm shadow-xs dark:border-neutral-700 dark:bg-neutral-900/60"
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100">
                      #{post.id}
                    </span>
                    <span>
                      作成: {new Date(post.createdAt).toLocaleString("ja-JP")}
                    </span>
                    {post.scheduledAt && (
                      <span>
                        予約: {new Date(post.scheduledAt).toLocaleString("ja-JP")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={post.status} />
                    {post.status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => void handleDummyPost(post.id)}
                        className="inline-flex items-center rounded-md bg-neutral-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        ダミー投稿実行
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handlePostNowToThreads(post.text)}
                      className="inline-flex items-center rounded-md border border-neutral-400 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-500 dark:text-neutral-100 dark:hover:bg-neutral-800"
                    >
                      この内容で Threads 即時投稿（テスト）
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap break-words rounded-md bg-white px-2 py-1 text-[13px] text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
                  {post.text}
                </pre>
                {post.status === "posted" && post.postedAt && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    ダミー投稿実行: {new Date(post.postedAt).toLocaleString("ja-JP")}
                  </p>
                )}
                {post.status === "failed" && post.errorMessage && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    エラー: {post.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold";

  if (status === "scheduled") {
    return (
      <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200`}>
        scheduled
      </span>
    );
  }

  if (status === "posted") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200`}>
        posted
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200`}>
        failed
      </span>
    );
  }

  if (status === "canceled") {
    return (
      <span className={`${base} bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-50`}>
        canceled
      </span>
    );
  }

  return (
    <span className={`${base} bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-50`}>
      {status}
    </span>
  );
}
