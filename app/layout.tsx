import './global.css'
import type { Metadata } from 'next'
import { Anton, EB_Garamond, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import { baseUrl } from './sitemap'

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
  metadataBase: new URL(baseUrl),
  title: {
    default: 'daveclintonn',
    template: '%s | daveclintonn',
  },
  description:
    'Engineering, systems, and general postulations on accomplishing amazing things with other people.',
  openGraph: {
    title: 'daveclintonn',
    description:
      'Engineering, systems, and general postulations on accomplishing amazing things with other people.',
    url: baseUrl,
    siteName: 'daveclintonn',
    locale: 'en_US',
    type: 'website',
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
