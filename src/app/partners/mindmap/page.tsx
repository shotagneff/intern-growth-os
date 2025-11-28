"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import type { Member } from "../../admin/members/page";

const MEMBERS_STORAGE_KEY = "igos_members_v1";
const INTRO_STORAGE_KEY = "igos_partner_intros_v2";

type Introduction = {
  id: string;
  introducerId: string;
  name: string;
  note?: string;
};

export default function PartnerMindmapPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [intros, setIntros] = useState<Introduction[]>([]);

  // メンバー情報と紹介レコードを localStorage から読み込む
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const rawMembers = window.localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (rawMembers) {
        const parsedMembers = JSON.parse(rawMembers) as Member[];
        if (Array.isArray(parsedMembers) && parsedMembers.length > 0) {
          setMembers(parsedMembers.filter((m) => m.active !== false));
        }
      }
    } catch (e) {
      console.error("Failed to load members for mindmap", e);
    }

    try {
      const rawIntros = window.localStorage.getItem(INTRO_STORAGE_KEY);
      if (rawIntros) {
        const parsedIntros = JSON.parse(rawIntros) as Introduction[];
        if (Array.isArray(parsedIntros)) {
          setIntros(parsedIntros);
        }
      }
    } catch (e) {
      console.error("Failed to load introductions for mindmap", e);
    }
  }, []);

  // 紹介レコードを持っているメンバーだけを CORE とみなす
  const cores = useMemo(() => {
    if (members.length === 0 || intros.length === 0) return [] as Member[];
    const introducerIds = new Set(intros.map((i) => i.introducerId));
    return members.filter((m) => introducerIds.has(m.id));
  }, [members, intros]);

  // CORE ごとに紹介先をまとめる
  const childrenByCore = useMemo(() => {
    const map: Record<string, Introduction[]> = {};
    for (const core of cores) {
      map[core.id] = intros.filter((i) => i.introducerId === core.id);
    }
    return map;
  }, [cores, intros]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-4 py-8 text-[var(--foreground)]">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-neutral-200 pb-5 text-sm dark:border-neutral-800">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Partner Map
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
              <Image
                src="/mindmap-icon.png"
                alt="パートナー紹介マインドマップアイコン"
                width={36}
                height={36}
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              パートナー紹介マインドマップ
            </h1>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            管理画面で登録した「誰が誰を紹介したか」の情報を元に、紹介関係を一望できるようにした関係図です。
          </p>
        </header>

        <section className="rounded-2xl border border-neutral-200 bg-white px-4 py-6 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
          {/* CORE（紹介元メンバー）を横並びに配置し、それぞれの直下に紹介先を並べる */}
          {cores.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-neutral-500 dark:text-neutral-400">
              まだ紹介レコードが登録されていません。管理画面「パートナー紹介マインドマップ（管理）」から登録してください。
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {cores.map((core) => (
                <div key={core.id} className="flex flex-col items-center">
                  {/* CORE ノード */}
                  <div className="rounded-full border border-neutral-300 bg-[#f5f5f7] px-5 py-3 text-center text-xs font-semibold text-neutral-800 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">CORE</p>
                    <p className="text-sm font-semibold">{core.name}</p>
                    {core.role && (
                      <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{core.role}</p>
                    )}
                  </div>

                  {/* CORE から下へのライン */}
                  <div className="my-3 h-6 w-px bg-neutral-300 dark:bg-neutral-700" />

                  {/* この CORE から紹介された相手一覧 */}
                  <div className="flex flex-col items-center gap-3">
                    {childrenByCore[core.id].length === 0 ? (
                      <p className="text-[11px] text-neutral-400 dark:text-neutral-500">紹介先なし</p>
                    ) : (
                      childrenByCore[core.id].map((intro) => (
                        <div key={intro.id} className="flex flex-col items-center">
                          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
                          <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                            <p className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-100">
                              {intro.name}
                            </p>
                            {intro.note && (
                              <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                                {intro.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[11px] shadow-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-300">
          <p className="font-semibold">この画面のイメージ</p>
          <p className="mt-1">
            ・中央に MITSUKETA 長期インターンチームを置き、その周りに「直接提携しているパートナー」を同心円状に配置しています。
          </p>
          <p className="mt-1">
            ・将来的には、ノードをクリックして詳細（契約数・売上・メモなど）を開いたり、ドラッグで位置を調整できるようなUIにも拡張できます。
          </p>
        </section>
      </div>
    </main>
  );
}
