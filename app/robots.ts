import { baseUrl } from 'app/sitemap'

export default function robots() {
  return {
    host: baseUrl,
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
