import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import portrait from "@/public/david.webp"
import {
  askAi,
  backgroundItems,
  email,
  introduction,
  otherProfiles,
  profile,
  site,
  socialLinks,
  workLinks,
} from "@/lib/portfolio-data"

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
}

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

  return (
    <main className="home-story">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="home-story-header">
        <div className="home-story-portrait">
          <Image
            src={portrait}
            alt={`${site.name}'s portrait`}
            width={128}
            height={128}
            loading="eager"
            fetchPriority="high"
            className="size-32 rounded-full border border-border object-cover"
          />
        </div>
        <h1>
          {site.name.split(" ").map((name, index) => (
            <span key={name}>
              {index > 0 ? " " : null}
              <span className="home-story-initial">{name[0]}</span>
              {name.slice(1)}
            </span>
          ))}
        </h1>
        <p>
          I&apos;m David Clinton, a software engineer in Mombasa, Kenya. I build software and write
          about what happens after it ships.
        </p>
      </header>

      <article className="home-story-article">
        <p id="links">
          I write alot of things on <Link href="/blog">my blog</Link>.
          If you&apos;d like to say hello, you can find me on{" "}
          <a href={socialLinks[2].href}>Twitter</a> or <a href={email.href}>email me</a>.
          You can also <Link href={askAi.href}>ask AI about me</Link>.
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
  )
}
