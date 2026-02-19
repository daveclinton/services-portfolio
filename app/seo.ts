export const siteConfig = {
  name: 'daveclintonn',
  owner: 'David Clinton',
  title: 'daveclintonn',
  description:
    'Platform, mobile, and infrastructure engineering notes by David Clinton.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://daveclintonn.com',
  locale: 'en_US',
  twitterHandle: '@daveclintonn',
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.url}${normalizedPath}`
}
