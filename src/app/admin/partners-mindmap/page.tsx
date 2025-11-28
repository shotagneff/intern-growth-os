"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Member } from "../members/page";

const MEMBERS_STORAGE_KEY = "igos_members_v1";
const INTRO_STORAGE_KEY = "igos_partner_intros_v2";
const PARTNERS_STORAGE_KEY = "igos_partners_v1";

type Introduction = {
  id: string;
  introducerId: string; // 紹介元（メンバーID）
  name: string; // 紹介された人の名前（自由入力）
  note?: string;
};

type Partner = {
  id: string;
  name: string;
  category?: string;
  note?: string;
  active: boolean;
};

export default function PartnersMindmapAdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [intros, setIntros] = useState<Introduction[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedCoreId, setSelectedCoreId] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<string>("");

  // 追加フォーム用
  const [newName, setNewName] = useState("");
  const [newIntroducerId, setNewIntroducerId] = useState<string>("");
  const [newNote, setNewNote] = useState("");

  // メンバー情報の読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawMembers = window.localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (rawMembers) {
        const parsed = JSON.parse(rawMembers) as Member[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMembers(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load members for partners mindmap", e);
    }
  }, []);

  // 紹介レコードの読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(INTRO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Introduction[];
        if (Array.isArray(parsed)) {
          setIntros(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load introductions", e);
    }
  }, []);

  // パートナーマスタの読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(PARTNERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partner[];
        if (Array.isArray(parsed)) {
          setPartners(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load partners for partners mindmap", e);
    }
  }, []);

  const coreCandidates = useMemo(
    () => members.filter((m) => m.active !== false),
    [members],
  );

  const handleAddIntro = () => {
    const name = newName.trim();
    if (!name) {
      alert("紹介された人の名前を入力してください。");
      return;
    }
    if (!newIntroducerId) {
      alert("紹介元メンバーを選択してください。");
      return;
    }

    const intro: Introduction = {
      id: crypto.randomUUID(),
      introducerId: newIntroducerId,
      name,
      note: newNote.trim() || undefined,
    };

    setIntros((prev) => [intro, ...prev]);

    // 紹介された人をパートナーマスタ（igos_partners_v1）にも自動登録
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(PARTNERS_STORAGE_KEY);
        const partners: Partner[] = raw ? (JSON.parse(raw) as Partner[]) : [];

        const exists = partners.some(
          (p) => p.name === name,
        );

        if (!exists) {
          const newPartner: Partner = {
            id: crypto.randomUUID(),
            name,
            // 紹介者情報などは必要に応じて後から /admin/partners で編集可能
            note: newNote.trim() || undefined,
            active: true,
          };
          const nextPartners = [...partners, newPartner];
          window.localStorage.setItem(
            PARTNERS_STORAGE_KEY,
            JSON.stringify(nextPartners),
          );
          setPartners(nextPartners);
        }
      } catch (e) {
        console.error("Failed to auto-register partner from introduction", e);
      }
    }
    setNewName("");
    setNewIntroducerId("");
    setNewNote("");
  };

  const handleDeleteIntro = (id: string) => {
    if (!window.confirm("この紹介レコードを削除しますか？")) return;
    setIntros((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, JSON.stringify(intros));
      setSaveMessage("紹介関係を保存しました。");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (e) {
      console.error("Failed to save introductions", e);
      setSaveMessage("保存に失敗しました。");
    }
  };

  // 選択中の紹介元メンバー
  const selectedCore = useMemo(
    () => members.find((m) => m.id === selectedCoreId) ?? null,
    [members, selectedCoreId],
  );

  // 選択中の紹介元からの紹介一覧
  const introducedByCore = useMemo(
    () => intros.filter((i) => i.introducerId === selectedCoreId),
    [intros, selectedCoreId],
  );

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <header className="mb-8 border-b border-neutral-200 pb-5 dark:border-neutral-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                Admin / Partners
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                パートナー紹介マインドマップ（管理）
              </h1>
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                メンバー管理の情報をもとに、誰が誰を紹介したか（紹介元1人）を登録し、マインドマップ表示と連携するための管理画面です。
              </p>
              {saveMessage && (
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{saveMessage}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              紹介関係を保存
            </button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* 左：紹介元・紹介先の編集テーブル */}
          <div className="rounded-2xl bg-white/90 p-4 text-xs shadow-sm dark:bg-neutral-900/80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                紹介レコードの管理
              </h2>
              <Link
                href="/admin/members"
                className="text-[11px] text-neutral-500 underline-offset-2 hover:underline"
              >
                メンバー管理へ
              </Link>
            </div>
            <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">
              紹介された人の名前は自由入力で登録し、紹介元はメンバー管理に登録されているメンバーから選択します。
            </p>

            {/* 追加フォーム */}
            <div className="mb-3 grid gap-2 text-[11px] sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.5fr)]">
              <div>
                <label className="mb-1 block text-[10px] text-neutral-600 dark:text-neutral-400">
                  紹介された人の名前
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例：A社 担当者"
                  className="w-full rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-neutral-600 dark:text-neutral-400">
                  紹介元メンバー
                </label>
                <select
                  value={newIntroducerId}
                  onChange={(e) => setNewIntroducerId(e.target.value)}
                  className="w-full rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                >
                  <option value="">選択してください</option>
                  {coreCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] text-neutral-600 dark:text-neutral-400">
                  メモ（任意）
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="例：イベント経由など"
                    className="w-full rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddIntro}
                    className="shrink-0 rounded-full bg-[#9e8d70] px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#8b7a5f]"
                  >
                    追加
                  </button>
                </div>
              </div>
            </div>

            {/* 登録済み一覧 */}
            <div className="mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
              {intros.length === 0 && (
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  まだ紹介レコードが登録されていません。上のフォームから追加してください。
                </p>
              )}

              {intros.length > 0 && (
                <table className="min-w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[11px] text-neutral-500 dark:border-neutral-700">
                      <th className="py-1 pr-2 font-normal">紹介元</th>
                      <th className="py-1 pr-2 font-normal">紹介された人</th>
                      <th className="py-1 pr-2 font-normal">メモ</th>
                      <th className="py-1 pr-2 font-normal text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intros.map((intro) => {
                      const introMember = members.find((m) => m.id === intro.introducerId);
                      const introPartner = partners.find((p) => p.name === intro.name);
                      return (
                        <tr
                          key={intro.id}
                          className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                        >
                          <td className="py-1 pr-2 text-neutral-800 dark:text-neutral-100">
                            {introMember?.name ?? "(不明)"}
                          </td>
                          <td className="py-1 pr-2 text-neutral-800 dark:text-neutral-100">
                            <div className="flex flex-col">
                              <span>{intro.name}</span>
                              {introPartner && (
                                <span className="mt-0.5 font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                                  ID: {introPartner.id}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-neutral-500 dark:text-neutral-400">
                            {intro.note ?? "-"}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteIntro(intro.id)}
                              className="rounded-full border border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* 右：ビジュアル表示 */}
          <div className="rounded-2xl bg-white/90 p-4 text-xs shadow-sm dark:bg-neutral-900/80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                紹介マインドマップ（プレビュー）
              </h2>
              <select
                value={selectedCoreId}
                onChange={(e) => setSelectedCoreId(e.target.value)}
                className="min-w-[140px] rounded-full border border-neutral-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="">紹介元を選択</option>
                {coreCandidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedCoreId && (
              <p className="mt-4 text-[11px] text-neutral-500 dark:text-neutral-400">
                右上のプルダウンから紹介元メンバーを選択すると、その人が紹介した相手がマインドマップ風に表示されます。
              </p>
            )}

            {selectedCoreId && selectedCore && (
              <div className="mt-2 flex h-full flex-col items-center justify-start gap-3">
                {/* 中央ノード（紹介元） */}
                <div className="rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
                  {selectedCore.name}
                </div>

                {/* 縦方向に紹介先を並べる */}
                <div className="relative flex w-full max-w-xs flex-col items-center">
                  {introducedByCore.length === 0 && (
                    <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                      この紹介元から登録されている紹介先はまだありません。
                    </p>
                  )}

                  {introducedByCore.length > 0 && (
                    <>
                      {/* 中央から下に伸びる線 */}
                      <div className="absolute top-0 h-full w-px bg-neutral-200 dark:bg-neutral-700" />

                      <div className="flex w-full flex-col items-center gap-2 pt-3">
                        {introducedByCore.map((intro) => (
                          <div key={intro.id} className="relative flex w-full items-center justify-center">
                            {/* 線の節 */}
                            <div className="absolute left-1/2 h-px w-6 -translate-x-1/2 bg-neutral-200 dark:bg-neutral-700" />
                            {/* ノード */}
                            <div className="relative z-10 inline-flex min-w-[140px] max-w-[240px] flex-col items-center rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-[11px] shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                              <span className="truncate font-medium text-neutral-800 dark:text-neutral-50">
                                {intro.name}
                              </span>
                              {intro.note && (
                                <span className="mt-0.5 truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                                  {intro.note}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
