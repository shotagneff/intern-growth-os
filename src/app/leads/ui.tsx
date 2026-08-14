"use client";

// 反響リード画面の見た目の部品。
// 既存ページの規約に合わせる（rounded-2xl + bg-white/90 + shadow-sm）。

import React from "react";

/** 見出し付きのパネル */
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

/** 見出しのない素のパネル */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80 ${className}`}
    >
      {children}
    </div>
  );
}

/** 数字ひとつを大きく見せるパネル */
export function Kpi({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "warn" | "good";
}) {
  const accent =
    tone === "warn"
      ? "text-red-600 dark:text-red-400"
      : tone === "good"
        ? "text-yellow-700 dark:text-yellow-300"
        : "";
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
