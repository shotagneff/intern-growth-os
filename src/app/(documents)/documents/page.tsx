"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { PAGE_MAIN, PAGE_INNER, PANEL, INPUT, PageHeader, MAIN_COLOR } from "@/components/panel";

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

export default function DocumentsPage() {
  const [docs, setDocs] = useState<StoredDoc[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) return;
        const data = (await res.json()) as StoredDoc[];
        if (Array.isArray(data)) {
          setDocs(data);
        }
      } catch (e) {
        console.error("failed to load documents", e);
      }
    };

    void fetchDocs();
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
  const toolDocs = filtered.filter((d) => d.category === "tool");

  return (
    <main className={PAGE_MAIN}>
      <div className={PAGE_INNER}>
        <PageHeader
          eyebrow="Documents Hub"
          title="ドキュメント"
          description="管理メンバーが整理したログイン先・資料リンクを一覧で確認できます。編集が必要な場合は管理メニューの「ドキュメントゾーン（管理）」から行ってください。"
          icon={
            <Image
              src="/document.png"
              alt="ドキュメントアイコン"
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          }
        />

        <section className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              <span className="inline-block h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: MAIN_COLOR }} />
              利用可能なドキュメント
            </h2>
            <div className="w-full max-w-xs">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={INPUT}
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
                    {loginDocs.map((doc) => {
                      const Wrapper: React.ElementType = doc.url ? "a" : "div";
                      const wrapperProps = doc.url
                        ? {
                            href: doc.url,
                            target: "_blank",
                            rel: "noreferrer",
                          }
                        : {};

                      return (
                        <Wrapper
                          key={doc.id}
                          className={`${PANEL} flex cursor-pointer flex-col justify-between p-4 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/80`}
                          {...wrapperProps}
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
                        </Wrapper>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-2 md:col-span-1">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  ツール系
                </h3>
                {toolDocs.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    該当するツール系ドキュメントはありません。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {toolDocs.map((doc) => {
                      const Wrapper: React.ElementType = doc.url ? "a" : "div";
                      const wrapperProps = doc.url
                        ? {
                            href: doc.url,
                            target: "_blank",
                            rel: "noreferrer",
                          }
                        : {};

                      return (
                        <Wrapper
                          key={doc.id}
                          className={`${PANEL} flex cursor-pointer flex-col justify-between p-4 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/80`}
                          {...wrapperProps}
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
                        </Wrapper>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-1">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  資料系
                </h3>
                {documentDocs.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    該当する資料系ドキュメントはありません。
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documentDocs.map((doc) => {
                      const Wrapper: React.ElementType = doc.url ? "a" : "div";
                      const wrapperProps = doc.url
                        ? {
                            href: doc.url,
                            target: "_blank",
                            rel: "noreferrer",
                          }
                        : {};

                      return (
                        <Wrapper
                          key={doc.id}
                          className={`${PANEL} flex cursor-pointer flex-col justify-between p-4 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/80`}
                          {...wrapperProps}
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
                        </Wrapper>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
