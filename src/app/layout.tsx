import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./Sidebar";
import { MobileNav } from "./MobileNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const MAIN_COLOR = "#9e8d70";

export const metadata: Metadata = {
  title: "intern growth OS",
  description: "長期インターンの成長と成果を可視化する OS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
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
      </body>
    </html>
  );
}
