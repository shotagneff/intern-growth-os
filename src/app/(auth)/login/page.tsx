"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return "/";
    const url = new URL(window.location.href);
    const next = url.searchParams.get("next");
    return next && next.startsWith("/") ? next : "/";
  }, []);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: id.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        setError(String(data?.error ?? "ログインに失敗しました"));
        return;
      }

      router.replace(nextPath);
    } catch (e) {
      console.error(e);
      setError("ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <div className="min-h-screen bg-gradient-to-b from-[#f5f5f7] via-[#f5f5f7] to-[#efe9df]">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-10 sm:px-6">
          <div className="w-full max-w-[420px]">
            <div className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur sm:p-7">
              <header className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  シークアドシステム
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
                  ログイン
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  管理者用のログインIDとパスワードを入力してください。
                </p>
              </header>

              <section className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600">
                    ログインID
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                    placeholder="例: admin"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
                    placeholder="パスワード"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "ログイン中..." : "続行"}
                </button>
              </section>
            </div>

            <p className="mt-4 text-center text-[11px] text-neutral-500">
              © {new Date().getFullYear()} Seekad
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
