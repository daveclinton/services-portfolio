import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SiteNav } from "@/components/portfolio/site-nav"
import { HomeComposer } from "@/components/portfolio/home-composer"
import { RevealSection } from "@/components/portfolio/reveal-section"
import portrait from "@/public/david.webp"
import {
  backgroundItems,
  bio,
  currentWork,
  email,
  introduction,
  otherProfiles,
  profile,
  services,
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

function roleDescription(id: string) {
  return backgroundItems.find((item) => item.id === id)?.description ?? ""
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

  const twitter = socialLinks.find((link) => link.icon === "x")

  return (
    <div className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main id="content">
        <header className="page-header home-hero">
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
          <p>{bio}</p>
          <HomeComposer />
        </header>

        <article className="home-article">
          <RevealSection>
            <h2>What I work on now</h2>
            <p>
              I&apos;m a software engineer at <a href={workLinks.mika}>Mika (Ideal Appliances)</a>,
              a group of home appliance companies in Kenya and Rwanda.
            </p>
            <dl className="home-stats">
              {currentWork.stats.map((stat) => (
                <div key={stat.label}>
                  <dt>{stat.label}</dt>
                  <dd>{stat.value}</dd>
                </div>
              ))}
            </dl>
            <p className="post-meta">{currentWork.note}</p>
            <ul className="home-cards">
              {currentWork.projects.map((project) => (
                <li key={project.title}>
                  <h3>{project.title}</h3>
                  <p>{project.text}</p>
                </li>
              ))}
            </ul>
          </RevealSection>

          <RevealSection>
            <h2 id="work-with-me">Work with me</h2>
            <p>
              Typical ranges in US dollars. The price depends on the scope, so{" "}
              <a href={email.href}>email me for a quote</a>.
            </p>
            <dl className="home-rates">
              {services.map((service) => (
                <div key={service.title}>
                  <dt>{service.title}</dt>
                  <dd>{service.price}</dd>
                </div>
              ))}
            </dl>
          </RevealSection>

          <RevealSection>
            <h2>Before and alongside Mika</h2>
            <p>
              I improved online payments for <a href={workLinks.givesuite}>GiveSuite</a> and{" "}
              <a href={workLinks.elementPay}>Element Pay</a>, and I write guides for developers
              through <a href={introduction.studio1hq}>Studio1HQ</a>. At{" "}
              <a href={workLinks.untapped}>Untapped Global</a>, {roleDescription("2022-05")}{" "}
              At <a href={introduction.paperspaceWriting}>Paperspace</a>,{" "}
              {roleDescription("2021-01")} See all{" "}
              <Link href="/experience">roles and dates</Link>.
            </p>
          </RevealSection>

          <RevealSection>
            <h2>Writing and contact</h2>
            <p id="links">
              I write on <Link href="/blog">my blog</Link>. You can find me on{" "}
              <a href={twitter?.href}>Twitter</a> or <a href={email.href}>email me</a>.
            </p>
          </RevealSection>

          <RevealSection>
            <h2>Outside of work</h2>
            <p>
              I enjoy <a href={introduction.gameOfThrones}>Game of Thrones</a>, sci-fi shows,
              and watching technical creators. I&apos;m also curious about where AI is going.
            </p>
          </RevealSection>

          <RevealSection>
            <h2>About this site</h2>
            <p>
              The home page follows <a href="https://grok.com/">Grok&apos;s</a> ask-first layout. The
              reading pages were inspired by{" "}
              <a href="https://dhh.dk/">David Heinemeier Hansson&apos;s website</a>.
            </p>
          </RevealSection>
        </article>
      </main>
    </div>
  )
}
