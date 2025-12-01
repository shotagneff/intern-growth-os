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
        <section className="w-full md:w-1/2">
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              intern growth OS
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              インターン専用の
              <br className="hidden sm:block" />
              成長ダッシュボード
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
              日々のアウトプットや動画研修、ドキュメントを一つのハブで管理するための社内ポータルです。
              ログインすると、あなたのメンバーIDに紐づいたコンテンツと進捗が表示されます。
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 text-[11px] text-neutral-700 dark:text-neutral-200 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
                <p className="font-semibold">動画研修ラーニング</p>
                <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  各セクションの視聴状況が自動で記録され、前のセクションを完了すると次が解放されます。
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/70">
                <p className="font-semibold">管理者メニュー</p>
                <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                  権限を持つメンバーだけがユーザーやコンテンツの管理メニューにアクセスできます。
                </p>
              </div>
            </div>
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
