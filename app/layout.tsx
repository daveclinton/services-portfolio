import type { Metadata } from "next";
import type { Viewport } from "next";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/portfolio-data";
import { cn } from "@/lib/utils";

// A serif designed for reading on screens; the site is mostly long-form text.
const reading = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-reading",
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
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
  viewportFit: "cover",
  // Android Chrome: shrink the page above the on-screen keyboard instead of
  // drawing the keyboard over it. iOS ignores this; see VisibleViewport.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn("min-h-full scroll-smooth antialiased", reading.variable)}
    >
      <body className="min-h-dvh overflow-x-hidden bg-background text-foreground">
        <a href="#content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
