import type { Metadata } from 'next'
import { Suspense } from 'react'
import { absoluteUrl } from 'app/seo'
import { CanvasClient } from './canvas-client'

export const metadata: Metadata = {
  title: 'Asset Generator',
  description: 'Generate exact-size app image assets from a master canvas.',
  alternates: {
    canonical: '/asset-generator',
  },
  openGraph: {
    title: 'Asset Generator | daveclintonn',
    description: 'Generate exact-size app image assets from a master canvas.',
    url: absoluteUrl('/asset-generator'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og?title=Asset%20Generator'),
        width: 1200,
        height: 630,
        alt: 'Asset generator preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asset Generator | daveclintonn',
    description: 'Generate exact-size app image assets from a master canvas.',
    images: [absoluteUrl('/og?title=Asset%20Generator')],
  },
}

export default function AssetGeneratorPage() {
  return (
    <Suspense fallback={<div className="asset-generator-loading">Loading asset generator...</div>}>
      <CanvasClient />
    </Suspense>
  )
}
