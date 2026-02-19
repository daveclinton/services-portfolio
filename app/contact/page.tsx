import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from 'app/components/theme-toggle'
import { absoluteUrl } from 'app/seo'

const contact = {
  phone: '+254701176923',
  email: 'clintondavid46@gmail.com',
  linkedin: 'https://www.linkedin.com/in/clintondavid46/',
  github: 'https://github.com/daveclinton',
  paperspace: 'https://blog.paperspace.com/author/david-clinton/',
  topSkills: ['Platform Engineering', 'Android Development', 'Backend Systems'],
}

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with David Clinton.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact | daveclintonn',
    description: 'Get in touch with David Clinton.',
    url: absoluteUrl('/contact'),
    type: 'profile',
    images: [
      {
        url: absoluteUrl('/og?title=Contact'),
        width: 1200,
        height: 630,
        alt: 'daveclintonn contact preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact | daveclintonn',
    description: 'Get in touch with David Clinton.',
    images: [absoluteUrl('/og?title=Contact')],
  },
}

export default function ContactPage() {
  return (
    <div className="portfolio-shell">
      <div className="portfolio-container">
        <header className="topbar" aria-label="Top navigation">
          <Link href="/" className="site-identity">
            <img src="/my-picture.jpg" alt="David Clinton" className="site-avatar" />
            <span className="site-name">daveclintonn</span>
          </Link>
          <nav className="top-nav" aria-label="Primary">
            <Link href="/blog">blog</Link>
            <Link href="/work">work</Link>
            <Link href="/contact">contact</Link>
            <ThemeToggle />
          </nav>
        </header>

        <section className="quote-strip quote-strip-centered" aria-label="Quote">
          <p>
            &ldquo;Build systems that survive contact with reality.&rdquo;
            <span> - David Clinton</span>
          </p>
        </section>

        <main className="contact-layout">
          <aside className="contact-rail">
            <h1>CONTACT</h1>
            <p>Reach out directly or follow my work.</p>
          </aside>

          <section className="contact-content" aria-label="Contact links">
            <ul className="contact-list">
              <li>
                <a href={`tel:${contact.phone}`} aria-label="Call David Clinton">
                  Call me
                </a>
              </li>
              <li>
                <a href={`mailto:${contact.email}`} aria-label="Email David Clinton">
                  Send email
                </a>
              </li>
              <li>
                <a href={contact.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={contact.github} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href={contact.paperspace} target="_blank" rel="noreferrer">
                  Paperspace
                </a>
              </li>
            </ul>
            <p className="contact-skills">
              Top Skills: {contact.topSkills.join(' · ')}
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
