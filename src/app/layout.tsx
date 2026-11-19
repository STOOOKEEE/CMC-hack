import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: "WrapScout — which token should I buy to own a stock?",
  description:
    "Compare every tokenized version of a stock, ETF or commodity and see which one is worth buying, why, and where — built on the CoinMarketCap API.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Wrap<span className="text-accent">Scout</span>
            </Link>
            <Link href="/method" className="min-h-11 content-center text-sm text-muted hover:text-fg">
              Method
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs text-muted">
            <span>Market data: CoinMarketCap</span>
            <Link href="/terms" className="hover:text-fg">
              Terms of use
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
