import type { Metadata } from "next";
import type { Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/portfolio-data";

/**
 * The reference calls for `Natadecoco`, a licensed rounded display face we
 * don't ship. Zen Maru Gothic is the closest available stand-in: rounded
 * terminals, a warm voice, and full Japanese coverage for the 🇯🇵 line.
 *
 * If the real font file ever lands in `public/fonts/Natadecoco.woff2`, swap
 * this block for `next/font/local` and keep the same CSS variable name.
 */
const portfolioSans = Zen_Maru_Gothic({
  variable: "--font-portfolio-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
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
  themeColor: "#FBFAF7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${portfolioSans.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
