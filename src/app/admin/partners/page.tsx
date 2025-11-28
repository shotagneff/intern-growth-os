"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "igos_partners_v1";

type Partner = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  active: boolean;
};

function loadPartners(): Partner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partner[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function savePartners(partners: Partner[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(partners));
  } catch {
    // ignore
  }
}

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setPartners(loadPartners());
  }, []);

  const resetForm = () => {
    setName("");
    setCategory("");
    setNote("");
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const base: Omit<Partner, "id"> = {
      name: name.trim(),
      category: category.trim() || undefined,
      note: note.trim() || undefined,
      active: true,
    };

    if (editingId) {
      const next = partners.map((p) => (p.id === editingId ? { ...p, ...base } : p));
      setPartners(next);
      savePartners(next);
    } else {
      const newPartner: Partner = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...base,
      };
      const next = [newPartner, ...partners];
      setPartners(next);
      savePartners(next);
    }

    resetForm();
  };

  const handleToggleActive = (id: string) => {
    const next = partners.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p,
    );
    setPartners(next);
    savePartners(next);
  };

  const handleEdit = (partner: Partner) => {
    setEditingId(partner.id);
    setName(partner.name);
    setCategory(partner.category ?? "");
    setNote(partner.note ?? "");
  };

  const handleDelete = (id: string) => {
    const next = partners.filter((p) => p.id !== id);
    setPartners(next);
    savePartners(next);
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Admin / Partners
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                パートナー管理
              </h1>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                パートナー企業・媒体・エージェントなどをメンバーとは別に管理します。紹介マインドマップやランキングの集計のベースとなる情報です。
              </p>
            </div>
          </div>
        </header>

        {/* 追加フォーム */}
        <section className="mb-6 rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {editingId ? "パートナーを編集" : "パートナーを追加"}
          </h2>
          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">パートナー名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：パートナーA"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">紹介者（任意）</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例：紹介者名や所属（◯◯さん / ◯◯社 など）"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-neutral-600">メモ（任意）</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例：担当部署、主な連携内容など"
                className="w-full rounded-full border border-neutral-200 bg-white px-3 py-2 text-xs outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                キャンセル
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary px-5 py-2 text-xs font-semibold shadow-sm"
            >
              {editingId ? "更新する" : "追加する"}
            </button>
          </div>
        </section>

        {/* 一覧 */}
        <section className="rounded-2xl bg-white/90 p-4 shadow-sm dark:bg-neutral-900/80">
          <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            登録済みパートナー
          </h2>
          {partners.length === 0 ? (
            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              まだパートナーは登録されていません。上のフォームから追加できます。
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-xs">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        {partner.name}
                      </p>
                      {partner.category && (
                        <p className="mt-0.5 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                          {partner.category}
                        </p>
                      )}
                      {partner.note && (
                        <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                          <span className="font-medium">メモ：</span>
                          <span>{partner.note}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleEdit(partner)}
                        className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-50"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(partner.id)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-300">
                    <div>
                      <span className="font-medium">ステータス：</span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(partner.id)}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          partner.active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {partner.active ? "有効" : "無効"}
                      </button>
                    </div>
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
