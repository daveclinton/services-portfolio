import type { Metadata } from "next";
import type { Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfolioHeader } from "@/components/portfolio";

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
  // Required for `env(safe-area-inset-*)` to report real values on iOS. Without
  // `cover`, in-app browsers letterbox the page instead of exposing the notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn("min-h-full scroll-smooth antialiased font-sans", inter.variable)}
    >
      <body className="mb-5 grid min-h-[calc(100dvh-20px)] grid-rows-[auto_minmax(0,1fr)] overflow-x-hidden bg-background text-foreground">
        <TooltipProvider>
          <div className="sticky top-0 z-20 bg-background">
            <div className="mx-auto w-full max-w-[680px] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 sm:pt-4 sm:pb-3">
              <PortfolioHeader />
            </div>
          </div>

          <main className="mx-auto flex min-h-0 min-w-0 w-full max-w-[680px] flex-col px-4 sm:px-6">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
