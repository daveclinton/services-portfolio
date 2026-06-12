import type { Metadata } from 'next'
import { Suspense } from 'react'
import { absoluteUrl } from 'app/seo'
import { AnimationPlayground } from './playground'

export const metadata: Metadata = {
  title: 'Animations',
  description: 'A categorized animation vocabulary registry for planning and implementing motion patterns.',
  alternates: {
    canonical: '/animations',
  },
  openGraph: {
    title: 'Animations | daveclintonn',
    description: 'Browse a categorized animation vocabulary registry.',
    url: absoluteUrl('/animations'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og?title=Animations'),
        width: 1200,
        height: 630,
        alt: 'CSS animation playground preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Animations | daveclintonn',
    description: 'Browse a categorized animation vocabulary registry.',
    images: [absoluteUrl('/og?title=Animations')],
  },
}

export default function AnimationsPage() {
  return (
    <Suspense fallback={null}>
      <AnimationPlayground />
    </Suspense>
  )
}
