import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";

const notoSans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "商素智作 - 电商商品素材生成与反馈优化助手",
  description: "面向抖音电商商家的商品素材生成与反馈优化助手",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border/60 bg-card/80 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <span className="text-2xl">🎨</span>
              <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">商素智作</span>
              <span className="text-xs text-muted-foreground hidden sm:inline border-l border-border/60 pl-2.5 ml-0.5">
                电商商品素材生成与反馈优化助手
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 flex-1">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
