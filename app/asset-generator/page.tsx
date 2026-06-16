import type { Metadata } from 'next'
import { Suspense } from 'react'
import { absoluteUrl } from 'app/seo'
import { AssetGeneratorClient } from './asset-generator-client'

export const metadata: Metadata = {
  title: 'Asset Generator',
  description:
    'Generate Expo and React Native app asset previews from brand text and color presets.',
  alternates: {
    canonical: '/asset-generator',
  },
  openGraph: {
    title: 'Asset Generator | daveclintonn',
    description:
      'Generate Expo and React Native app asset previews from brand text and color presets.',
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
    description:
      'Generate Expo and React Native app asset previews from brand text and color presets.',
    images: [absoluteUrl('/og?title=Asset%20Generator')],
  },
}

export default function AssetGeneratorPage() {
  return (
    <Suspense fallback={<div className="asset-generator-loading">Loading asset generator...</div>}>
      <AssetGeneratorClient />
    </Suspense>
  )
}
