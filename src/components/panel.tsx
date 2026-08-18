// パネル調UIの共通部品。全ページの見た目をここに集約して揃える。
//
// 規約（Apple風ミニマル）:
//   ページ枠  … 薄いグレー背景 + 中央寄せ + 縦リズム
//   パネル    … rounded-2xl + 白カード(bg-white/90) + 細い枠 + 微細シャドウ
//   見出し    … 上部にゴールドのアクセントバー + タイトル(+説明)
//   入力      … rounded-xl + focus でゴールド枠
//
// 表示専用（hooks なし）なので、サーバー/クライアントどちらのページからも使える。

import React from "react";

export const MAIN_COLOR = "#9e8d70";

/** ページ外枠 <main> のクラス */
export const PAGE_MAIN = "min-h-screen bg-[#f5f5f7] text-[var(--foreground)]";
/** ページ内側 <div> のクラス（中央寄せ・余白・縦リズム） */
export const PAGE_INNER = "mx-auto max-w-6xl px-5 py-8 sm:px-6 space-y-6";

/** 素のパネル1枚分のクラス */
export const PANEL =
  "rounded-2xl border border-neutral-200 bg-white/90 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/80";

/** テキスト入力・selectの共通クラス */
export const INPUT =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900";

/** textareaの共通クラス */
export const TEXTAREA =
  "w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm outline-none transition-colors focus:border-[#9e8d70] dark:border-neutral-700 dark:bg-neutral-900";

/** ページヘッダー（小見出し＋タイトル＋説明＋右側アクション） */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            {icon && (
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#f2e7d3]">
                {icon}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{title}</h1>
          </div>
          {description && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** 見出しのない素のパネル */
export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${PANEL} ${className}`}>{children}</div>;
}

/** 見出し（＋説明・アクション）つきのパネル。中身は本文領域(p-5)に入る */
export function SectionCard({
  title,
  description,
  action,
  children,
  bodyClassName = "p-5",
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3.5 dark:border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-5 w-1 shrink-0 rounded-full" style={{ backgroundColor: MAIN_COLOR }} />
            <h2 className="truncate text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
              {title}
            </h2>
          </div>
          {description && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

/** 数字ひとつを大きく見せるKPIパネル */
export function Kpi({
  label,
  value,
  hint,
  tone = "normal",
}: {
  label: string;
  value: React.ReactNode;
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
    <div className={`${PANEL} p-5`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-neutral-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

/** ゴールドの主ボタン */
export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${className}`}
      style={{ backgroundColor: MAIN_COLOR, ...(props.style ?? {}) }}
    >
      {children}
    </button>
  );
}
