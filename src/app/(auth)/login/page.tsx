"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PANEL, INPUT, PrimaryButton } from "@/components/panel";

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
            <div className={`${PANEL} p-6 backdrop-blur sm:p-7`}>
              <header className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  シークアドシステム
                </p>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
                  ログイン
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  管理者用のログインIDとパスワードを入力してください。
                </p>
              </header>

              <section className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    ログインID
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className={`${INPUT} mt-1 py-2.5`}
                    placeholder="例: admin"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                    パスワード
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${INPUT} mt-1 py-2.5`}
                    placeholder="パスワード"
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <PrimaryButton
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "ログイン中..." : "続行"}
                </PrimaryButton>
              </section>
            </div>

            <p className="mt-4 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
              © {new Date().getFullYear()} Seekad
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
