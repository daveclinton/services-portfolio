import type { Metadata } from 'next'
import Link from 'next/link'
import { absoluteUrl } from 'app/seo'
import {
  Circle,
  Diamond,
  Download,
  Menu,
  MousePointer2,
  Palette,
  Smartphone,
  Square,
  Type,
} from 'lucide-react'
import { AssetGeneratorLayout } from './components/AssetGeneratorLayout'

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

const tools = [
  { label: 'Select', icon: MousePointer2, active: true },
  { label: 'Text', icon: Type },
  { label: 'Rectangle', icon: Square },
  { label: 'Diamond', icon: Diamond },
  { label: 'Ellipse', icon: Circle },
]

export default function AssetGeneratorPage() {
  return (
    <AssetGeneratorLayout
      topLeft={
        <>
          <Link href="/" className="asset-excalidraw-icon-button" aria-label="Back to home">
            <Menu aria-hidden="true" />
          </Link>
          <div className="asset-excalidraw-island asset-excalidraw-properties">
            <span>Background</span>
            <i />
          </div>
        </>
      }
      toolbar={
        <div className="asset-excalidraw-island asset-excalidraw-toolbar">
          {tools.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              className={active ? 'is-active' : undefined}
              aria-label={label}
              aria-pressed={active ? true : undefined}
            >
              <Icon aria-hidden="true" />
            </button>
          ))}
        </div>
      }
      topRight={
        <>
          <button type="button" className="asset-excalidraw-icon-button" aria-label="Colors">
            <Palette aria-hidden="true" />
          </button>
          <button type="button" className="asset-excalidraw-icon-button" aria-label="Export">
            <Download aria-hidden="true" />
          </button>
        </>
      }
      sidebar={
        <>
          <div className="asset-excalidraw-sidebar-section">
            <span>Project</span>
            <strong>Asset Generator</strong>
          </div>
          <div className="asset-excalidraw-sidebar-section">
            <span>Layer</span>
            <strong>Icon canvas</strong>
          </div>
          <div className="asset-excalidraw-sidebar-section">
            <span>Size</span>
            <strong>1024 x 1024</strong>
          </div>
        </>
      }
      preview={
        <>
          <div className="asset-excalidraw-device-tabs" role="tablist" aria-label="Platform">
            <button type="button" role="tab" aria-selected="true">
              iOS
            </button>
            <button type="button" role="tab" aria-selected="false">
              Android
            </button>
          </div>
          <div className="asset-excalidraw-phone">
            <div className="asset-excalidraw-phone-island" />
            <div className="asset-excalidraw-phone-screen">
              <Smartphone aria-hidden="true" />
            </div>
          </div>
        </>
      }
      canvas={
        <div className="asset-excalidraw-canvas">
          <div className="asset-excalidraw-safe-zone" />
          <span>CANVAS AREA</span>
        </div>
      }
    />
  )
}
