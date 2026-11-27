import type { Metadata } from "next";
import type { Viewport } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/portfolio-data";
import { toneScript } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { ViewportFocus } from "@/components/portfolio/visible-viewport";
import { Toaster } from "@/components/ui/toast";

// A serif designed for reading on screens; the site is mostly long-form text.
const reading = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-reading",
  display: "swap",
});

// Plain grotesque for the navigation and the home page.
const display = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
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
  colorScheme: "dark",
  themeColor: "#1557c0",
  viewportFit: "cover",
  // Android Chrome: shrink the page above the on-screen keyboard instead of
  // drawing the keyboard over it. iOS ignores this; see VisibleViewport.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-tone="0"
      // The head script may change data-tone before React hydrates.
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn("min-h-full scroll-smooth antialiased", reading.variable, display.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: toneScript }} />
      </head>
      <body className="min-h-dvh overflow-x-hidden bg-background text-foreground">
        <ViewportFocus />
        <Toaster />
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
