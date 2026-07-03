import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "경구약제 검출",
  description: "이미지를 업로드해 알약 종류와 위치를 검출하고 시각화합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
