import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン | intern portable site",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /login 用のセグメントレイアウト: ここでは単に children を返すだけ
  return <>{children}</>;
}
