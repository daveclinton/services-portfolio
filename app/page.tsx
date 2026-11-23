import type { Metadata } from "next"
import { SiteNav } from "@/components/portfolio/site-nav"
import { Signals } from "@/components/portfolio/signals"
import { email, otherProfiles, profile, site, socialLinks } from "@/lib/portfolio-data"
import { signals } from "@/lib/signals"

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
}

const SOCIAL_NAMES = { github: "GitHub", linkedin: "LinkedIn", x: "X" } as const

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: site.name,
        alternateName: profile.handle,
      },
      {
        "@type": "ProfilePage",
        "@id": `${site.url}/#profile`,
        url: site.url,
        mainEntity: { "@id": `${site.url}/#person` },
      },
      {
        "@type": "Person",
        "@id": `${site.url}/#person`,
        name: site.name,
        alternateName: site.alternateNames,
        url: site.url,
        image: `${site.url}${profile.avatarSrc}`,
        description: site.description,
        jobTitle: site.jobTitle,
        homeLocation: {
          "@type": "Place",
          name: site.location.country,
          address: {
            "@type": "PostalAddress",
            addressCountry: site.location.countryCode,
          },
        },
        nationality: { "@type": "Country", name: site.location.country },
        sameAs: [...socialLinks.map((link) => link.href), ...otherProfiles],
      },
    ],
  }

  return (
    <div className="page home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main id="content">
        <h1 className="sr-only">{site.name}, {site.jobTitle}</h1>
        <Signals
          items={signals}
          footer={
            <ul aria-label="Contact">
              <li><a href={email.href}>Email</a></li>
              {socialLinks.map((link) => (
                <li key={link.href}><a href={link.href}>{SOCIAL_NAMES[link.icon]}</a></li>
              ))}
            </ul>
          }
        />
      </main>
    </div>
  )
}
