"use client";

// アポ獲得管理の見た目の部品。
// 反響リード（src/app/leads/ui.tsx）と同じ規約に揃える。

import React from "react";

export const ACCENT = "#9e8d70";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

/** 表の外枠。横に長い表を、画面ではなくこの中だけでスクロールさせる */
export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      {children}
    </div>
  );
}

export const TH =
  "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400";
export const TD = "whitespace-nowrap px-3 py-2 text-sm";

/** 表の中で使う入力欄。枠を出さず、触れるところだけ分かるようにする */
export const CELL_INPUT =
  "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-neutral-200 focus:border-neutral-300 focus:bg-white dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:bg-neutral-900";

export function Pill({ text, tone }: { text: string; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>
      {text}
    </span>
  );
}

export function yen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}
