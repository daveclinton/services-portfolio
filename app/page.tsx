import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import portrait from "@/public/david.webp"
import { formatPostDate, getPosts } from "@/lib/blog"
import {
  askAi,
  backgroundItems,
  email,
  introduction,
  now,
  otherProfiles,
  profile,
  site,
  socialLinks,
  workLinks,
} from "@/lib/portfolio-data"

function formatMonth(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
}

export default async function Home() {
  const [latestPost] = await getPosts()
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
          name: `${site.location.city}, ${site.location.country}`,
          address: {
            "@type": "PostalAddress",
            addressLocality: site.location.city,
            addressCountry: site.location.countryCode,
          },
        },
        nationality: { "@type": "Country", name: site.location.country },
        sameAs: [...socialLinks.map((link) => link.href), ...otherProfiles],
      },
    ],
  }

  const twitter = socialLinks.find((link) => link.icon === "x")

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <main id="content">
        <header className="page-header">
          <Image
            src={portrait}
            alt={`Portrait of ${site.name}`}
            width={96}
            height={96}
            loading="eager"
            fetchPriority="high"
            className="home-portrait size-24 rounded-full object-cover"
          />
          <h1>{site.name}</h1>
          <p>
            I&apos;m a software engineer in Mombasa, Kenya. I build software and write about what
            happens after it ships.
          </p>
        </header>

        <article className="home-article">
          <p id="links">
            I write a lot on <Link href="/blog">my blog</Link>. If you&apos;d like to say hello,
            you can find me on <a href={twitter?.href}>Twitter</a> or{" "}
            <a href={email.href}>email me</a>. You can also{" "}
            <Link href={askAi.href}>ask AI about me</Link>.
          </p>

          <section>
            <h2>Opesi Mansion</h2>
            <p>
              I started <a href={introduction.company.href}>{introduction.company.name}</a> to help
              businesses understand and build useful software beyond the hype and demos on our feeds.
            </p>
          </section>

          <section>
            <h2>Making everyday work simpler</h2>
            <p>
              At <a href={workLinks.mika}>Mika (Ideal Appliances)</a>,{" "}
              {backgroundItems[0].description}
            </p>
          </section>

          <section>
            <h2>Payments and developer guides</h2>
            <p>
              I improved online payment experiences for <a href={workLinks.givesuite}>GiveSuite</a> and{" "}
              <a href={workLinks.elementPay}>Element Pay</a>. Through{" "}
              <a href={introduction.studio1hq}>Studio1HQ</a>, I also wrote practical guides for developers.
            </p>
          </section>

          <section>
            <h2>Investment data</h2>
            <p>
              At <a href={workLinks.untapped}>Untapped Global</a>, {backgroundItems[2].description}
            </p>
          </section>

          <section>
            <h2>Writing for developers</h2>
            <p>
              At <a href={introduction.paperspaceWriting}>Paperspace</a>,{" "}
              {backgroundItems[3].description}
            </p>
          </section>

          <section>
            <h2>Outside of work</h2>
            <p>
              I enjoy <a href={introduction.gameOfThrones}>Game of Thrones</a>, sci-fi shows,
              and watching technical creators. I&apos;m also curious about where AI is going.
            </p>
          </section>

          <section>
            <h2>Work experience</h2>
            <p>
              For roles and dates, see my <Link href="/experience">work experience</Link>.
            </p>
          </section>

          <section>
            <h2>About this site</h2>
            <p>
              The layout was inspired by{" "}
              <a href="https://dhh.dk/">David Heinemeier Hansson&apos;s website</a>. I visit
              his site probably too often.
            </p>
          </section>
        </article>
      </main>
    </div>
  )
}
