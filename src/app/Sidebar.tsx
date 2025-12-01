"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const MAIN_COLOR = "#9e8d70";

type SidebarLinkProps = {
  href: string;
  label: string;
  disabled?: boolean;
};

export default function Sidebar() {
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
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
    <aside
      className="flex w-64 flex-col border-r bg-white px-5 py-6 text-sm shadow-sm dark:bg-neutral-950/90"
      style={{ borderColor: MAIN_COLOR }}
    >
      <div className="mb-5 pb-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <Link href="/daily-reports" className="flex items-center gap-3.5">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-neutral-200 bg-white shadow-sm dark:border-neutral-700">
            <Image src="/logoseekad.png" alt="SEEKAD ロゴ" fill className="object-contain" />
          </div>
          <div>
            <span
              className="block text-sm font-semibold uppercase tracking-wide"
              style={{ color: MAIN_COLOR }}
            >
              intern portable site
            </span>
            <span className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              インターンポータブルサイト
            </span>
          </div>
        </Link>
      </div>

      <nav className="space-y-1">
        <SidebarLink href="/" label="ホーム" />
        <SidebarLink href="/daily-reports" label="日報・ホウレンソウ" />
        <SidebarLink href="/dashboard" label="売上・KPIダッシュボード" />
        <SidebarLink href="/e-learning" label="動画研修ラーニング" />
        <SidebarLink href="/partners/mindmap" label="パートナー紹介マインドマップ" />
        <SidebarLink href="/rankings" label="ランキングボード" />
        <SidebarLink href="/documents" label="ドキュメント" />

        {isAdmin && (
          <>
            <div className="mt-3 border-t border-dashed border-neutral-200 pt-2 text-[10px] uppercase tracking-[0.16em] text-neutral-400 dark:border-neutral-800">
              管理メニュー
            </div>
            <SidebarLink href="/docs" label="ドキュメントゾーン（管理）" />
            <SidebarLink href="/admin/partners-mindmap" label="パートナー紹介マインドマップ（管理）" />
            <SidebarLink href="/admin/e-learning" label="動画研修ラーニング（管理）" />
            <SidebarLink href="/admin/members" label="メンバー管理（管理者用）" />
            <SidebarLink href="/admin/users" label="ユーザー管理（管理者用）" />
          </>
        )}
      </nav>

      <div className="mt-auto pt-6 text-[10px] text-neutral-500">
        <p>β版 / デザイン・機能は今後変更される可能性があります。</p>
      </div>
    </aside>
  );
}

function SidebarLink({ href, label, disabled }: SidebarLinkProps) {
  const pathname = usePathname();
  const baseClass =
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors";

  if (disabled) {
    return (
      <div
        className={`${baseClass} cursor-not-allowed text-neutral-400 dark:text-neutral-600`}
      >
        <span>
          {label}
          <span className="ml-1 text-[10px] align-middle text-neutral-400">
            準備中
          </span>
        </span>
      </div>
    );
  }

  const isActive =
    href === "/"
      ? pathname === "/"
      : href !== "#" && pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`${baseClass} relative pl-4 ${
        isActive
          ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full"
          style={{ backgroundColor: MAIN_COLOR }}
        />
      )}
      <span>{label}</span>
    </Link>
  );
}
