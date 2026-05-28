import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Aron Seller AI - CS Agent Control Panel",
  applicationName: "Aron Seller AI",
  description: "온라인 셀러를 위한 24시간 프리미엄 AI CS 에이전트 관제센터",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3" },
      { url: "/favicon.png?v=3", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

