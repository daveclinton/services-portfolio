import './global.css'
import type { Metadata } from 'next'
import { Anton, EB_Garamond, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { absoluteUrl, siteConfig } from './seo'

const anton = Anton({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: '400',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
})

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    'David Clinton',
    'Software Engineer',
    'Platform Engineering',
    'Mobile Engineering',
    'Infrastructure',
    'FastAPI',
    'Next.js',
    'Android',
  ],
  authors: [{ name: siteConfig.owner }],
  creator: siteConfig.owner,
  publisher: siteConfig.owner,
  category: 'technology',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: 'website',
    images: [
      {
        url: absoluteUrl(`/og?title=${encodeURIComponent(siteConfig.title)}`),
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} social preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    creator: siteConfig.twitterHandle,
    images: [absoluteUrl(`/og?title=${encodeURIComponent(siteConfig.title)}`)],
  },
}

const cx = (...classes: string[]) => classes.filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={cx(anton.variable, inter.variable, ebGaramond.variable)}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              const saved = localStorage.getItem('theme');
              const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
              const theme = saved === 'light' || saved === 'dark'
                ? saved
                : (prefersLight ? 'light' : 'dark');
              document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
          })();`}
        </Script>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
