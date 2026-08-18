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

const STORAGE_KEY = "igos_members_v1";

export type Member = {
  id: string;
  name: string; // 表示名
  team?: string; // 所属
  role?: string; // 役割（シークアドメンバー / メンターなど）
  iconUrl?: string; // /images/avatars/avatar_hiraga.jpg など
  active: boolean;
};

const initialMembers: Member[] = [
  {
    id: "hiraga",
    name: "平賀　翔大",
    team: "営業",
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_hiraga.jpg",
    active: true,
  },
  {
    id: "takuma",
    name: "宅間　宗大",
    team: "営業",
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_takuma.jpg",
    active: true,
  },
  {
    id: "sato",
    name: "佐藤　翔永",
    team: "営業",
    role: "シークアドメンバー",
    iconUrl: "/images/avatars/avatar_sato.png",
    active: true,
  },
];

export default function MembersAdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);

  const fetchMembersFromApi = async () => {
    try {
      const res = await fetch("/api/admin/members", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch members");
      const data = (await res.json()) as Member[];
      if (Array.isArray(data) && data.length > 0) {
        setMembers(data);
      } else {
        setMembers(initialMembers);
      }
      setIsDirty(false);
    } catch (e) {
      console.error("Failed to load members from API", e);
      setMembers(initialMembers);
      setIsDirty(false);
    }
  };

  // 初期ロード + タブに戻ってきたときに常に最新を反映
  useEffect(() => {
    void fetchMembersFromApi();

    if (typeof window === "undefined") return;
    const handleFocus = () => {
      if (isDirty) return;
      void fetchMembersFromApi();
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isDirty]);

  // 変更が入ったら自動保存（編集中の消失防止）
  useEffect(() => {
    if (members.length === 0) return;
    if (!isDirty) return;

    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/members", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members }),
        });
        if (!res.ok) throw new Error("Failed to autosave members");
        setIsDirty(false);
      } catch (e) {
        console.error("Failed to autosave members", e);
      }
    }, 600);

    return () => window.clearTimeout(t);
  }, [members, isDirty]);

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
    setIsDirty(true);

    setName("");
    setRole("");
    setIconUrl("");
  };

  const updateMember = (id: string, patch: Partial<Member>) => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setIsDirty(true);
  };

  const deleteMember = (id: string) => {
    if (!window.confirm("このメンバーを削除しますか？")) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setIsDirty(true);
    void fetch(`/api/admin/members?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch((e) => console.error("Failed to delete member", e));
  };

  const handleManualSave = () => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/members", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members }),
        });
        if (!res.ok) throw new Error("Failed to save members");
        setIsDirty(false);
        setSaveMessage("メンバー情報を保存しました。");
        setTimeout(() => setSaveMessage(""), 3000);
      } catch (e) {
        console.error("Failed to save members manually", e);
        setSaveMessage("保存に失敗しました。");
      }
    })();
  };

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <div>
          <PageHeader
            eyebrow="Admin / Members"
            title="メンバー管理"
            description="日報や将来の機能で参照するメンバー情報をここで管理します。"
            action={
              <button
                type="button"
                onClick={handleManualSave}
                className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                変更を保存
              </button>
            }
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span>現在アクティブなメンバー: {activeMembersCount} 名</span>
            {saveMessage && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{saveMessage}</span>
            )}
          </div>
        </div>

        {/* 追加フォーム */}
        <SectionCard title="メンバーを追加">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：平賀　翔大"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                役職
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="例：マネージャー"
                className={INPUT}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                アイコンURL
              </label>
              <input
                type="text"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
                placeholder="例：/images/avatars/avatar_hiraga.jpg"
                className={INPUT}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <PrimaryButton type="button" onClick={handleAdd}>
              + メンバーを追加
            </PrimaryButton>
          </div>
        </SectionCard>

        {/* 一覧 */}
        <SectionCard title="登録メンバー一覧">
          {members.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              まだメンバーが登録されていません。
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900"
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
                      className="w-full border-none bg-transparent text-sm font-medium outline-none"
                    />
                  </div>

                  {/* 下段：役職・アイコンURL・有効・削除 */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={m.role || ""}
                      onChange={(e) => updateMember(m.id, { role: e.target.value })}
                      placeholder="役職"
                      className="min-w-[120px] rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <input
                      type="text"
                      value={m.iconUrl || ""}
                      onChange={(e) => updateMember(m.id, { iconUrl: e.target.value })}
                      placeholder="/images/avatars/..."
                      className="min-w-[160px] flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400">
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
                      className="text-[11px] font-semibold text-red-500 transition-colors hover:text-red-600"
                    >
                      削除
                    </button>
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
