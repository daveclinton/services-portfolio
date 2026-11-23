import type { Metadata } from "next"
import Link from "next/link"
import { SiteNav } from "@/components/portfolio/site-nav"
import { HomeComposer } from "@/components/portfolio/home-composer"
import { IndustryPhoto } from "@/components/portfolio/industry-photo"
import { RevealSection } from "@/components/portfolio/reveal-section"
import { CheckArt, ConnectArt, ControlArt, RunArt } from "@/components/portfolio/work-illustrations"
import {
  approach,
  email,
  industries,
  intro,
  otherProfiles,
  photoCredits,
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

const art = { connect: ConnectArt, control: ControlArt, check: CheckArt, run: RunArt }

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
    <div className="page home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteNav />
      <main id="content">
        <header className="home-hero">
          <h1>{intro.headline}</h1>
          <p>{intro.text}</p>
          <HomeComposer />
        </header>

        <section className="home-letter" aria-label="A letter from David Clinton">
          <p>Hello,</p>
          <p>
            I am David Clinton, a software engineer in Kenya. I help companies put AI to work in the
            software and data they already have.
          </p>
          <p>
            Getting an AI demo to work is quick. Getting it to work every day takes more: the right
            data, limits on what it can see and change, a way to check its answers, and an engineer
            who fixes it when something breaks. That is the work I do.
          </p>
          <p>
            At <a href={workLinks.mika}>Mika</a>, a group of home appliance companies with about 400
            employees, I built and run an AI assistant that answers staff questions from live company
            data. It shows each person only what they are allowed to see, and it asks before it
            changes anything. The systems I support connect to business records that grow by about
            480,000 documents a year, including those created in other tools.
          </p>
          <p>
            Before that I built dashboards for investors, payment screens, school apps and guides for
            developers. I work from the first version to live support, and I deal directly with the
            people who will use it.
          </p>
          <p>
            If you have an AI idea stuck at the demo stage, a slow process or a system nobody wants to
            touch, <a href={email.href}>tell me about it</a>.
          </p>
          <p className="home-signature">
            David Clinton
            <span><Link href="/experience">See my work experience</Link></span>
          </p>
        </section>

        <section className="home-section" aria-labelledby="approach">
          <h2 id="approach">What it takes to make AI useful</h2>
          <ul className="approach">
            {approach.map((item) => {
              const Art = art[item.id]
              return (
                <li key={item.id} data-tone={item.id}>
                  <RevealSection>
                    <Art />
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </RevealSection>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="home-section" aria-labelledby="industries">
          <h2 id="industries">Industries I have worked in</h2>
          <ul className="industries">
            {industries.map((item, index) => (
              <li key={item.id}>
                <IndustryPhoto src={`/industries/${item.id}.webp`} alt={item.alt} wide={index % 4 === 0 || index % 4 === 3} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <p className="industry-companies">
                  {item.companies.map((company, i) => (
                    <span key={company.name}>
                      {i > 0 ? " and " : null}
                      {"href" in company ? <a href={company.href}>{company.name}</a> : company.name}
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="home-rates" aria-labelledby="work-with-me">
          <div>
            <h2 id="work-with-me">Work with me</h2>
            <p>Typical ranges in US dollars. The final price depends on the scope.</p>
            <a href={email.href} className="home-action">Email me for a quote</a>
          </div>
          <dl>
            {services.map((service) => (
              <div key={service.title}>
                <dt>{service.title}</dt>
                <dd>{service.price}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className="home-footer" id="links">
          <p>
            I write on <Link href="/blog">my blog</Link>. Find me on <a href={twitter?.href}>Twitter</a>,{" "}
            <a href="https://github.com/daveclinton">GitHub</a> and{" "}
            <a href="https://www.linkedin.com/in/clintondavid46/">LinkedIn</a>.
          </p>
          <details>
            <summary>Photo credits</summary>
            <p>The photos show each industry. They are not pictures of the companies. All were cropped and resized.</p>
            <ul>
              {photoCredits.map((photo) => (
                <li key={photo.href}>
                  <a href={photo.href}>{photo.title}</a>, {photo.author},{" "}
                  {"licenseHref" in photo ? <a href={photo.licenseHref}>{photo.license}</a> : photo.license}
                </li>
              ))}
            </ul>
          </details>
        </footer>
      </main>
    </div>
  )
}
