"use client";

import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "igos_members_v1";

export type Member = {
  id: string;
  name: string; // 表示名
  team?: string; // 所属
  role?: string; // 役割（インターン / メンターなど）
  iconUrl?: string; // /avatar_photo/avatar_hiraga.jpg など
  active: boolean;
};

const initialMembers: Member[] = [
  {
    id: "hiraga",
    name: "平賀　翔大",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_hiraga.jpg",
    active: true,
  },
  {
    id: "takuma",
    name: "宅間　宗大",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_takuma.jpg",
    active: true,
  },
  {
    id: "sato",
    name: "佐藤　翔永",
    team: "営業",
    role: "長期インターン",
    iconUrl: "/avatar_photo/avatar_sato.png",
    active: true,
  },
];

export default function MembersAdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState<string>("");

  const loadMembersFromStorage = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setMembers(initialMembers);
        return;
      }
      const parsed = JSON.parse(raw) as Member[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMembers(parsed);
      } else {
        setMembers(initialMembers);
      }
    } catch (e) {
      console.error("Failed to load members", e);
      setMembers(initialMembers);
    }
  };

  // 初期ロード + タブに戻ってきたときに常に最新を反映
  useEffect(() => {
    loadMembersFromStorage();

    if (typeof window === "undefined") return;
    const handleFocus = () => {
      loadMembersFromStorage();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // 保存は「変更を保存」ボタンから明示的に行う

  const activeMembersCount = useMemo(
    () => members.filter((m) => m.active).length,
    [members],
  );

  const handleAdd = () => {
    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    const trimmedIcon = iconUrl.trim();

    if (!trimmedName || !trimmedRole || !trimmedIcon) {
      alert("名前・役職・アイコンURLをすべて入力してください。");
      return;
    }

    const newMember: Member = {
      id: crypto.randomUUID(),
      name: trimmedName,
      role: trimmedRole,
      iconUrl: trimmedIcon,
      active: true,
    };
    setMembers((prev) => [...prev, newMember]);

    setName("");
    setRole("");
    setIconUrl("");
  };

  const updateMember = (id: string, patch: Partial<Member>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const deleteMember = (id: string) => {
    if (!window.confirm("このメンバーを削除しますか？")) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleManualSave = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
      }
      setSaveMessage("メンバー情報を保存しました。");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error("Failed to save members manually", e);
      setSaveMessage("保存に失敗しました。");
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Admin / Members
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                メンバー管理
              </h1>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                日報や将来の機能で参照するメンバー情報をここで管理します。
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                現在アクティブなメンバー: {activeMembersCount} 名
              </p>
              {saveMessage && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{saveMessage}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleManualSave}
              className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              変更を保存
            </button>
          </div>
        </header>

        {/* 追加フォーム */}
        <section className="mb-6 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            メンバーを追加
          </h2>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">名前</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：平賀　翔大"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">役職</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="例：マネージャー"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">アイコンURL</label>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="例：/avatar_photo/avatar_hiraga.jpg"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              className="btn-primary px-5 py-2 text-xs font-semibold shadow-sm"
            >
              + メンバーを追加
            </button>
          </div>
        </section>

        {/* 一覧 */}
        <section className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            登録メンバー一覧
          </h2>
          {members.length === 0 ? (
            <p className="mt-3 text-xs text-neutral-500">まだメンバーが登録されていません。</p>
          ) : (
            <div className="mt-3 space-y-2 text-xs">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  {/* 上段：アイコン＋名前 */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-[10px] text-neutral-500 dark:bg-neutral-800">
                      {m.iconUrl ? (
                        <img
                          src={m.iconUrl}
                          alt={m.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>NO ICON</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => updateMember(m.id, { name: e.target.value })}
                      className="w-full border-none bg-transparent text-xs outline-none"
                    />
                  </div>

                  {/* 下段：役職・アイコンURL・有効・削除 */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={m.role || ""}
                      onChange={(e) => updateMember(m.id, { role: e.target.value })}
                      placeholder="役職"
                      className="min-w-[120px] rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
                    />
                    <input
                      type="text"
                      value={m.iconUrl || ""}
                      onChange={(e) => updateMember(m.id, { iconUrl: e.target.value })}
                      placeholder="/avatar_photo/..."
                      className="min-w-[160px] flex-1 rounded-full border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-neutral-600">
                      <input
                        type="checkbox"
                        checked={m.active}
                        onChange={(e) => updateMember(m.id, { active: e.target.checked })}
                        className="h-3 w-3 rounded border-neutral-300 text-emerald-500 focus:ring-0"
                      />
                      <span>有効</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => deleteMember(m.id)}
                      className="text-[11px] text-red-500 hover:text-red-600"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
