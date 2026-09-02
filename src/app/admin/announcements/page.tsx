"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PAGE_MAIN,
  PAGE_INNER,
  INPUT,
  TEXTAREA,
  PageHeader,
  SectionCard,
  Panel,
  PrimaryButton,
} from "@/components/panel";

type AdminAnnouncement = {
  id: string;
  title: string;
  body: string;
  category?: string;
  linkUrl?: string;
  publishedAt?: string;
  authorMemberId?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type Member = {
  id: string;
  name: string;
  team?: string;
  role?: string;
  iconUrl?: string;
  active: boolean;
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<AdminAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [members, setMembers] = useState<Member[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("お知らせ");
  const [linkUrl, setLinkUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [authorMemberId, setAuthorMemberId] = useState("");
  const [active, setActive] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch announcements");
      const data = (await res.json()) as AdminAnnouncement[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchItems();
  }, []);

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch("/api/members", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Failed to fetch members", res.status, text);
          setMembers([]);
          return;
        }

        const data = (await res.json()) as Member[];
        setMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setMembers([]);
      }
    };

    void loadMembers();
  }, []);

  const handleAdd = async () => {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      alert("タイトルと本文は必須です。");
      return;
    }

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          body: b,
          category,
          linkUrl,
          publishedAt,
          authorMemberId: authorMemberId.trim() || undefined,
          active,
        }),
      });
      if (!res.ok) throw new Error("Failed to create announcement");

      setTitle("");
      setBody("");
      setCategory("お知らせ");
      setLinkUrl("");
      setPublishedAt("");
      setAuthorMemberId("");
      setActive(true);

      setMessage("お知らせを追加しました。");
      setTimeout(() => setMessage(""), 2500);
      await fetchItems();
    } catch (e) {
      console.error(e);
      setMessage("追加に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const updateLocal = (id: string, patch: Partial<AdminAnnouncement>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleSave = async (it: AdminAnnouncement) => {
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(it),
      });
      if (!res.ok) throw new Error("Failed to save announcement");
      setMessage("保存しました。");
      setTimeout(() => setMessage(""), 2000);
      await fetchItems();
    } catch (e) {
      console.error(e);
      setMessage("保存に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("このお知らせを削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      setMessage("削除しました。");
      setTimeout(() => setMessage(""), 2000);
      await fetchItems();
    } catch (e) {
      console.error(e);
      setMessage("削除に失敗しました。");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    });
  }, [items]);

  const labelClass = "mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="Admin / Announcements"
          title="お知らせ管理"
          description="ホームのカレンダー前に表示するお知らせを管理します。"
          action={
            <button
              type="button"
              onClick={() => void fetchItems()}
              className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              再読み込み
            </button>
          }
        />

        {message && (
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{message}</p>
        )}

        <SectionCard title="お知らせを追加">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>タイトル（必須）</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={labelClass}>表示</label>
              <select
                value={active ? "on" : "off"}
                onChange={(e) => setActive(e.target.value === "on")}
                className={INPUT}
              >
                <option value="on">表示する</option>
                <option value="off">非表示</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>日付（表示用）</label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={labelClass}>発信者（メンバー）</label>
              <select
                value={authorMemberId}
                onChange={(e) => setAuthorMemberId(e.target.value)}
                className={INPUT}
              >
                <option value="">未指定</option>
                {members
                  .filter((m) => m.active)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.role ? `（${m.role}）` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>カテゴリ</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={INPUT}
              >
                <option value="お知らせ">お知らせ</option>
                <option value="プレスリリース">プレスリリース</option>
                <option value="最新情報">最新情報</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>リンクURL（任意）</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>本文（必須）</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className={TEXTAREA}
              />
            </div>
          </div>
          <div className="mt-4">
            <PrimaryButton type="button" onClick={() => void handleAdd()}>
              追加する
            </PrimaryButton>
          </div>
        </SectionCard>

        <SectionCard
          title="登録済みお知らせ"
          action={
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {loading ? "読み込み中..." : `${sorted.length} 件`}
            </span>
          }
        >
          {sorted.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">お知らせがありません。</p>
          ) : (
            <div className="space-y-4">
              {sorted.map((it) => (
                <Panel key={it.id} className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                        {it.active ? "表示中" : "非表示"}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {it.title}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-500">
                        {it.updatedAt ? `更新: ${new Date(it.updatedAt).toLocaleString()}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSave(it)}
                        className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 shadow-sm transition-colors hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(it.id)}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm transition-colors hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
                      >
                        削除
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>タイトル</label>
                      <input
                        type="text"
                        value={it.title}
                        onChange={(e) => updateLocal(it.id, { title: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>表示</label>
                      <select
                        value={it.active ? "on" : "off"}
                        onChange={(e) => updateLocal(it.id, { active: e.target.value === "on" })}
                        className={INPUT}
                      >
                        <option value="on">表示する</option>
                        <option value="off">非表示</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>日付（表示用）</label>
                      <input
                        type="date"
                        value={it.publishedAt ?? ""}
                        onChange={(e) => updateLocal(it.id, { publishedAt: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>発信者（メンバー）</label>
                      <select
                        value={it.authorMemberId ?? ""}
                        onChange={(e) => updateLocal(it.id, { authorMemberId: e.target.value })}
                        className={INPUT}
                      >
                        <option value="">未指定</option>
                        {members
                          .filter((m) => m.active)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}{m.role ? `（${m.role}）` : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>カテゴリ</label>
                      <select
                        value={it.category ?? "お知らせ"}
                        onChange={(e) => updateLocal(it.id, { category: e.target.value })}
                        className={INPUT}
                      >
                        <option value="お知らせ">お知らせ</option>
                        <option value="プレスリリース">プレスリリース</option>
                        <option value="最新情報">最新情報</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>リンクURL</label>
                      <input
                        type="url"
                        value={it.linkUrl ?? ""}
                        onChange={(e) => updateLocal(it.id, { linkUrl: e.target.value })}
                        className={INPUT}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>本文</label>
                      <textarea
                        value={it.body}
                        onChange={(e) => updateLocal(it.id, { body: e.target.value })}
                        rows={4}
                        className={TEXTAREA}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-[10px] text-neutral-400">ID: {it.id}</div>
                </Panel>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
