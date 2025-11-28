"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

const STORAGE_KEY = "igos_docs_v1";

type DocCategory = "login" | "document";

type StoredDoc = {
  id: string;
  title: string;
  category: DocCategory;
  note?: string;
  createdAt: string;
};

const CATEGORY_LABELS: Record<DocCategory, string> = {
  login: "ログイン系",
  document: "資料系",
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

export default function DocumentsPage() {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setDocs(loadDocs());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((doc) => {
      const inTitle = doc.title.toLowerCase().includes(q);
      const inNote = doc.note?.toLowerCase().includes(q) ?? false;
      return inTitle || inNote;
    });
  }, [docs, query]);

  const loginDocs = filtered.filter((d) => d.category === "login");
  const documentDocs = filtered.filter((d) => d.category === "document");

  return (
    <div className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-[var(--foreground)] dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Documents Hub
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/document.png"
                alt="ドキュメントアイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              ドキュメント
            </h1>
          </div>
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            管理メンバーが整理したログイン先・資料リンクを一覧で確認できます。編集が必要な場合は管理メニューの「ドキュメントゾーン（管理）」から行ってください。
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              利用可能なドキュメント
            </h2>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-950"
                placeholder="タイトル・メモで検索"
              />
            </div>
          </div>

          {docs.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              まだドキュメントが登録されていません。管理メニューの「ドキュメントゾーン（管理）」から追加できます。
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  ログイン系
                </h3>
                {loginDocs.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    該当するログイン系ドキュメントはありません。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {loginDocs.map((doc) => (
                      <article
                        key={doc.id}
                        className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                            {doc.title}
                          </p>
                          <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                            {doc.note && (
                              <div>
                                <span className="font-medium">メモ：</span>
                                <span>{doc.note}</span>
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
              </div>

              <div className="space-y-2 md:col-span-2">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  資料系
                </h3>
                {documentDocs.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    該当する資料系ドキュメントはありません。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentDocs.map((doc) => (
                      <article
                        key={doc.id}
                        className="flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                      >
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                            {doc.title}
                          </p>
                          <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
                            {doc.note && (
                              <div>
                                <span className="font-medium">メモ：</span>
                                <span>{doc.note}</span>
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
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
