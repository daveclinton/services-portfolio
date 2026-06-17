import type { MetadataRoute } from 'next'
import { siteConfig } from './seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: 'daveclintonn',
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    id: 'daveclintonn-portfolio',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0a0a0a',
    background_color: '#ffffff',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '192x192',
        type: 'image/x-icon',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '512x512',
        type: 'image/x-icon',
        purpose: 'any',
      },
    ],
  }
}
