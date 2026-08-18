"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PAGE_MAIN,
  PAGE_INNER,
  INPUT,
  PageHeader,
  SectionCard,
  PrimaryButton,
} from "@/components/panel";

type Role = "admin" | "user";

type UserRow = {
  loginId: string;
  displayName?: string;
  role: Role;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loginId, setLoginId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = (await res.json()) as UserRow[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const activeCount = useMemo(() => users.filter((u) => u.active).length, [users]);

  const handleCreateOrReset = async () => {
    const id = loginId.trim();
    const name = displayName.trim();
    const pw = password.trim();
    if (!id || !pw) {
      alert("ログインIDとパスワードを入力してください。");
      return;
    }

    setLoading(true);
    setSaveMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: id, displayName: name || undefined, password: pw, role, active: true }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        alert(String(data?.error ?? "保存に失敗しました"));
        return;
      }

      setLoginId("");
      setDisplayName("");
      setPassword("");
      setRole("user");
      setSaveMessage("ユーザーを保存しました（同IDがある場合はパスワードを更新します）。");
      setTimeout(() => setSaveMessage(""), 3000);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (u: UserRow, patch: Partial<UserRow>) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: u.loginId,
          displayName: patch.displayName ?? u.displayName ?? "",
          role: patch.role ?? u.role,
          active: patch.active ?? u.active,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!window.confirm(`ユーザー ${u.loginId} を削除しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?loginId=${encodeURIComponent(u.loginId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      await fetchUsers();
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (u: UserRow) => {
    const newPw = window.prompt(`新しいパスワードを入力してください（${u.loginId}）`);
    if (!newPw) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: u.loginId,
          displayName: u.displayName ?? "",
          password: newPw,
          role: u.role,
          active: u.active,
        }),
      });
      if (!res.ok) throw new Error("Failed to reset password");
      setSaveMessage("パスワードを更新しました。");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <div>
          <PageHeader
            eyebrow="Admin / Users"
            title="ユーザー管理"
            description="ログインID/パスワードを発行してアクセス権限を渡すための管理画面です。"
            action={
              <button
                type="button"
                onClick={() => void fetchUsers()}
                disabled={loading}
                className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                再読み込み
              </button>
            }
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>現在アクティブなユーザー: {activeCount} 件</span>
            {saveMessage && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
          </div>
        </div>

        <SectionCard title="ユーザーを追加（またはパスワード更新）">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                ログインID
              </label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="例：admin2"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                名前（表示名）
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例：平賀 翔大"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                パスワード
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="発行するパスワード"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                権限
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className={INPUT}
              >
                <option value="user">一般</option>
                <option value="admin">管理者</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <PrimaryButton
              type="button"
              onClick={() => void handleCreateOrReset()}
              disabled={loading}
            >
              保存
            </PrimaryButton>
          </div>
        </SectionCard>

        <SectionCard title="登録ユーザー一覧">
          {loading && (
            <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">読み込み中...</p>
          )}

          {users.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              ユーザーが登録されていません。
            </p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.loginId}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {u.loginId}
                      </span>
                      {u.displayName && (
                        <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
                          {u.displayName}
                        </span>
                      )}
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        role: {u.role} / {u.active ? "active" : "inactive"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={u.displayName ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          setUsers((prev) =>
                            prev.map((x) => (x.loginId === u.loginId ? { ...x, displayName: value } : x))
                          );
                        }}
                        onBlur={(e) => void updateUser(u, { displayName: e.target.value })}
                        placeholder="表示名"
                        className="min-w-[160px] rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
                        disabled={loading}
                      />

                      <select
                        value={u.role}
                        onChange={(e) => void updateUser(u, { role: e.target.value as Role })}
                        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[11px] outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
                        disabled={loading}
                      >
                        <option value="user">一般</option>
                        <option value="admin">管理者</option>
                      </select>

                      <label className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <input
                          type="checkbox"
                          checked={u.active}
                          onChange={(e) => void updateUser(u, { active: e.target.checked })}
                          className="h-3 w-3 rounded border-neutral-300 text-emerald-500 focus:ring-0"
                          disabled={loading}
                        />
                        <span>有効</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => void resetPassword(u)}
                        disabled={loading}
                        className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      >
                        PW変更
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteUser(u)}
                        disabled={loading}
                        className="text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
