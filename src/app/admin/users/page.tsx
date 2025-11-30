"use client";

import { useEffect, useState, FormEvent } from "react";

type User = {
  id: string;
  memberId: string;
  name: string | null;
  isAdmin: boolean;
  createdAt: string;
};

export default function UsersAdminPage() {
  const [meLoading, setMeLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [memberId, setMemberId] = useState("");
  const [name, setName] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data?.user?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setMeLoading(false);
      }
    };

    void fetchMe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users as User[]);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void fetchUsers();
  }, [isAdmin]);

  const reloadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.users)) {
        setUsers(data.users as User[]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, name, isAdmin: newIsAdmin }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "保存に失敗しました");
        setSaving(false);
        return;
      }

      // 再読み込み
      await reloadUsers();

      setMemberId("");
      setName("");
      setNewIsAdmin(false);
      setEditingUserId(null);
      setSaving(false);
    } catch (err) {
      console.error(err);
      setError("通信に失敗しました");
      setSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUserId(user.id);
    setMemberId(user.memberId);
    setName(user.name ?? "");
    setNewIsAdmin(user.isAdmin);
    setError(null);
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`ユーザー「${user.memberId}」を削除しますか？`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "削除に失敗しました");
        return;
      }

      await reloadUsers();

      if (editingUserId === user.id) {
        setEditingUserId(null);
        setMemberId("");
        setName("");
        setNewIsAdmin(false);
      }
    } catch (err) {
      console.error(err);
      setError("通信に失敗しました");
    }
  };

  if (meLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-xs text-neutral-500">認証情報を確認中...</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-[var(--foreground)] dark:bg-neutral-950">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          このページにアクセスする権限がありません。
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-[var(--foreground)] dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            ユーザー管理
          </h1>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            ログイン可能なメンバーIDを一覧・追加できます。
          </p>
        </header>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            メンバー追加 / 更新
            {editingUserId && (
              <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                編集モード
              </span>
            )}
          </h2>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex-1 space-y-1">
                <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                  member_id
                </label>
                <input
                  type="text"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                  required
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                  名前（任意）
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="newIsAdmin"
                type="checkbox"
                checked={newIsAdmin}
                onChange={(e) => setNewIsAdmin(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-neutral-700 focus:ring-neutral-500 dark:border-neutral-600"
              />
              <label
                htmlFor="newIsAdmin"
                className="text-[11px] text-neutral-700 dark:text-neutral-300"
              >
                管理者として登録する
              </label>
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-2 inline-flex items-center rounded-full bg-[#ad9c79] px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#9b8a65] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "保存中..." : editingUserId ? "更新" : "保存"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            ユーザー一覧
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-neutral-700 dark:text-neutral-200">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] text-neutral-500 dark:border-neutral-700">
                  <th className="px-2 py-1.5">member_id</th>
                  <th className="px-2 py-1.5">名前</th>
                  <th className="px-2 py-1.5">管理者</th>
                  <th className="px-2 py-1.5">作成日</th>
                  <th className="px-2 py-1.5">アクション</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-neutral-100 last:border-b-0 dark:border-neutral-800"
                  >
                    <td className="px-2 py-1.5 font-mono text-[11px]">{u.memberId}</td>
                    <td className="px-2 py-1.5">{u.name || "-"}</td>
                    <td className="px-2 py-1.5">
                      {u.isAdmin ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          管理者
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          一般
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString("ja-JP")
                        : "-"}
                    </td>
                    <td className="px-2 py-1.5 text-[11px]">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(u)}
                          className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-700 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-200"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="rounded-full border border-rose-300 px-2 py-0.5 text-[10px] text-rose-700 hover:border-rose-400 dark:border-rose-500 dark:text-rose-300"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-2 py-3 text-center text-[11px] text-neutral-500"
                    >
                      まだユーザーが登録されていません。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
