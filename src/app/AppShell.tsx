"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { MobileNav } from "./MobileNav";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--background)]">
        <div className="md:hidden">
          <MobileNav />
        </div>
        {children}
      </div>
    </div>
  );
}
