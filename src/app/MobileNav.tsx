"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

const MAIN_COLOR = "#9e8d70";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return href !== "#" && pathname.startsWith(href);
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.user?.isAdmin) {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void fetchMe();
  }, []);

  return (
    <div className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 px-4 py-3 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="flex items-center justify-between">
        <Link href="/" onClick={close}>
          <div className="flex flex-col">
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: MAIN_COLOR }}
            >
              intern growth OS
            </span>
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50">
              成長ダッシュボード
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          aria-label="メニューを開く"
        >
          <div className="space-y-[3px]">
            <span className="block h-[2px] w-4 rounded bg-neutral-800 dark:bg-neutral-100" />
            <span className="block h-[2px] w-4 rounded bg-neutral-800 dark:bg-neutral-100" />
            <span className="block h-[2px] w-4 rounded bg-neutral-800 dark:bg-neutral-100" />
          </div>
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 rounded-2xl border border-neutral-200 bg-white p-2 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {/* 一般メニュー */}
          <div className="space-y-1">
            <MobileLink href="/" label="ホーム" active={isActive("/")} onClick={close} />
            <MobileLink
              href="/daily-reports"
              label="日報・ホウレンソウ"
              active={isActive("/daily-reports")}
              onClick={close}
            />
            <MobileLink
              href="/dashboard"
              label="売上・KPIダッシュボード"
              active={isActive("/dashboard")}
              onClick={close}
            />
            <MobileLink
              href="/e-learning"
              label="動画研修ラーニング"
              active={isActive("/e-learning")}
              onClick={close}
            />
            <MobileLink
              href="/partners/mindmap"
              label="パートナー紹介マインドマップ"
              active={isActive("/partners/mindmap")}
              onClick={close}
            />
            <MobileLink
              href="/rankings"
              label="ランキングボード"
              active={isActive("/rankings")}
              onClick={close}
            />
            <MobileLink
              href="/documents"
              label="ドキュメント"
              active={isActive("/documents")}
              onClick={close}
            />
          </div>

          {/* 管理メニュー（管理者のみ） */}
          {isAdmin && (
            <div className="space-y-1 border-t border-dashed border-neutral-200 pt-2 text-[13px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              <p className="px-1 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                管理メニュー
              </p>
              <MobileLink
                href="/docs"
                label="ドキュメントゾーン（管理）"
                active={isActive("/docs")}
                onClick={close}
              />
              <MobileLink
                href="/admin/partners-mindmap"
                label="パートナー紹介マインドマップ（管理）"
                active={isActive("/admin/partners-mindmap")}
                onClick={close}
              />
              <MobileLink
                href="/admin/e-learning"
                label="動画研修ラーニング（管理）"
                active={isActive("/admin/e-learning")}
                onClick={close}
              />
              <MobileLink
                href="/admin/members"
                label="メンバー管理（管理者用）"
                active={isActive("/admin/members")}
                onClick={close}
              />
              <MobileLink
                href="/admin/users"
                label="ユーザー管理（管理者用）"
                active={isActive("/admin/users")}
                onClick={close}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type MobileLinkProps = {
  href: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
};

function MobileLink({ href, label, disabled, active, onClick }: MobileLinkProps) {
  const base =
    "flex items-center rounded-xl px-3 py-2 text-sm font-medium";

  if (disabled) {
    return (
      <div className={`${base} cursor-not-allowed text-neutral-400 dark:text-neutral-600`}>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${base} ${
        active
          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <span>{label}</span>
    </Link>
  );
}
