import type { Metadata } from 'next'
import { absoluteUrl } from 'app/seo'
import { AssetGenerator } from './components/AssetGenerator'

export const metadata: Metadata = {
  title: 'Asset Generator',
  description: 'Draft app icon and launch image assets from a visual shell.',
  alternates: {
    canonical: '/asset-generator',
  },
  openGraph: {
    title: 'Asset Generator | daveclintonn',
    description: 'Draft app icon and launch image assets from a visual shell.',
    url: absoluteUrl('/asset-generator'),
    type: 'website',
    images: [
      {
        url: absoluteUrl('/og?title=Asset%20Generator'),
        width: 1200,
        height: 630,
        alt: 'Asset generator shell preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Asset Generator | daveclintonn',
    description: 'Draft app icon and launch image assets from a visual shell.',
    images: [absoluteUrl('/og?title=Asset%20Generator')],
  },
}

export default function AssetGeneratorPage() {
  return <AssetGenerator />
}