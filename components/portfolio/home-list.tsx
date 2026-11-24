import { NumberedPage } from "@/components/portfolio/numbered-page"
import { otherProfiles, profile, site, socialLinks } from "@/lib/portfolio-data"
import { signals } from "@/lib/signals"

export function HomeList({ initial }: { initial?: number }) {
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
    <NumberedPage id="home" heading={`${site.name}, ${site.jobTitle}`} items={signals} listPath="/" basePath="" initial={initial}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </NumberedPage>
  )
}
