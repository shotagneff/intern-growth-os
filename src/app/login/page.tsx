"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "ログインに失敗しました");
        setLoading(false);
        return;
      }

      // ログイン成功 -> ホームへ
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("通信に失敗しました");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f6f1e8] via-[#f5f5f7] to-[#e3edf7] px-4 py-8 text-[var(--foreground)] dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 md:flex-row md:items-stretch">
        <section className="relative w-full md:w-1/2">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl opacity-30 blur-[1px] md:opacity-40"
            style={{
              backgroundImage: "url('/login-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative max-w-md">
            <p className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-600 shadow-sm ring-1 ring-neutral-200/80 dark:bg-neutral-900/70 dark:text-neutral-300 dark:ring-neutral-700">
              intern portable site
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl md:text-4xl dark:text-neutral-50">
              インターンポータブルサイト
            </h1>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-neutral-700 md:text-sm dark:text-neutral-300">
              日々のアウトプットや動画研修、ドキュメントを一つのハブで管理するための株式会社SEEKADのポータルサイトです。
              ログインすると、あなたのメンバーIDに紐づいたコンテンツと進捗が表示されます。
            </p>
          </div>
        </section>

        <section className="w-full md:w-1/2">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-neutral-200 bg-white/95 px-6 py-7 text-sm shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              ログイン
            </h2>
            <p className="mt-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              付与された社内IDと共通パスワードを入力してください。
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                  社内ID
                </label>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ad9c79] focus:outline-none focus:ring-1 focus:ring-[#ad9c79] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                  required
                  placeholder="例：intern001"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-200">
                  共通パスワード
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-[#ad9c79] focus:outline-none focus:ring-1 focus:ring-[#ad9c79] dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                  required
                  placeholder="SEEKAD から共有されたパスワード"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-[#ad9c79] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#9b8a65] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
