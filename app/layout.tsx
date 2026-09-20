import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  PortfolioFooter,
  PortfolioHeader,
} from "@/components/portfolio";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: site.name,
    title: site.title,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full antialiased font-sans", inter.variable)}
    >
      <body className="flex h-dvh flex-col bg-background text-foreground">
        <TooltipProvider>
          {/* The header and footer are pinned to the viewport; only the
              middle column between them scrolls. */}
          <div className="shrink-0 bg-background">
            <div className="mx-auto w-full max-w-[680px] px-4 pt-10 pb-4 sm:px-6 sm:pt-14 sm:pb-5">
              <PortfolioHeader />
            </div>
          </div>

          <main className="flex min-h-0 flex-1 scroll-smooth flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-4 pb-12 sm:px-6 sm:pb-16">
              {children}
            </div>
          </main>

          <div className="shrink-0 border-t border-border bg-background">
            <div className="mx-auto w-full max-w-[680px] px-4 py-4 sm:px-6 sm:py-5">
              <PortfolioFooter />
            </div>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
