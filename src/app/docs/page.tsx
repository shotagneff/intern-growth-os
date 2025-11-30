"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "igos_docs_v1";

type DocCategory = "login" | "document" | "tool";

type StoredDoc = {
  id: string;
  title: string;
  category: DocCategory;
  note?: string;
  createdAt: string;
  url?: string;
};

const CATEGORY_LABELS: Record<DocCategory, string> = {
  login: "ログイン系",
  document: "資料系",
  tool: "ツール系",
};

function loadDocs(): StoredDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDoc[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveDocs(docs: StoredDoc[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // ignore
  }
}

export default function DocsPage() {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocCategory>("login");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  const resetForm = () => {
    setTitle("");
    setCategory("login");
    setNote("");
    setEditingId(null);
    setUrl("");
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    const base: Omit<StoredDoc, "id" | "createdAt"> = {
      title: title.trim(),
      category,
      note: note.trim() || undefined,
      url: url.trim() || undefined,
    };

    if (editingId) {
      // 既存ドキュメントの更新
      const next = docs.map((d) =>
        d.id === editingId ? { ...d, ...base } : d,
      );
      setDocs(next);
      saveDocs(next);
    } else {
      // 新規追加
      const newDoc: StoredDoc = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...base,
      };
      const next = [newDoc, ...docs];
      setDocs(next);
      saveDocs(next);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    const next = docs.filter((d) => d.id !== id);
    setDocs(next);
    saveDocs(next);
  };

  const handleEdit = (doc: StoredDoc) => {
    setEditingId(doc.id);
    setTitle(doc.title);
    setCategory(doc.category);
    setNote(doc.note ?? "");
    setUrl(doc.url ?? "");
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Admin / Documents
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            ドキュメントゾーン（管理）
          </h1>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            ログイン先や各種資料のリンクをカード形式で管理します。本番のパスワードそのものは保存せず、「どこに保管しているか」のメモだけを残します。
          </p>
        </header>

        <section className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {editingId ? "ドキュメントを編集" : "ドキュメントを追加"}
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                タイトル
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="例：ChatGPT（スタートプラン）"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocCategory)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
              >
                <option value="login">ログイン系</option>
                <option value="document">資料系</option>
                <option value="tool">ツール系</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                メモ（任意）
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="例：スタートプランは採用広報チームで利用"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                URL（任意）
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="例：https://example.com/tool"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center rounded-md bg-[#9e8d70] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#8b7b62] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 focus-visible:ring-[#9e8d70] dark:focus-visible:ring-offset-neutral-950"
            >
              {editingId ? "更新する" : "追加する"}
            </button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            登録済みドキュメント
          </h2>
          {docs.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              まだドキュメントは登録されていません。上のフォームから追加できます。
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {docs.map((doc) => (
                <article
                  key={doc.id}
                  className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {doc.title}
                        </p>
                        <p className="mt-0.5 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                          {CATEGORY_LABELS[doc.category]}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleEdit(doc)}
                          className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="text-neutral-400 hover:text-red-500"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                      {doc.note && (
                        <div>
                          <span className="font-medium">メモ：</span>
                          <span>{doc.note}</span>
                        </div>
                      )}
                      {doc.url && (
                        <div className="mt-0.5">
                          <span className="font-medium">URL：</span>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-sky-600 underline underline-offset-2 dark:text-sky-400"
                          >
                            {doc.url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
                    <span>
                      追加日：{new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
