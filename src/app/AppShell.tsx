"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // /login ではサイドバー・モバイルナビを表示しない
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar (desktop) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto bg-[var(--background)]">
        {/* Mobile top nav */}
        <div className="md:hidden">
          <MobileNav />
        </div>
        {children}
      </div>
    </div>
  );
}
