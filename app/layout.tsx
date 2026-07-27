import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PROJECT MARKET — PSYNET",
  description: "만들면 투자받고, 참여하면 성과금 — PSYNET 프로젝트 마켓.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
