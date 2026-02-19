import Link from 'next/link'
import type { Metadata } from 'next'
import { ThemeToggle } from 'app/components/theme-toggle'
import { WorkExperienceList } from 'app/components/work-experience-list'
import { absoluteUrl } from 'app/seo'

const profile = {
  name: 'David Clinton',
  role: 'Software Engineer',
  location: 'Mombasa, Mombasa County, Kenya',
  summary:
    'I build infrastructure, developer tooling, and high-performance systems where software meets real-world constraints.',
  contact: {
    substack: 'https://substack.com/@daveclintonn',
  },
}

const experiences = [
  {
    company: 'MIKA (Ideal Appliances LTD)',
    role: 'Software Engineer, Platform & Mobile',
    start: 'October 2025',
    end: 'Present',
    duration: '5 months',
    location: 'Mombasa County, Kenya',
    highlights: [
      'Architected and delivered an operations platform spanning Warehouse Management, After-Sales, and Attendance/HR workflows across a FastAPI backend and multiple Next.js dashboards, giving teams a single operational system.',
      'Built core warehouse business flows (inbound/outbound, transfers, investigations, and SAP document posting), improving inventory control accuracy and reducing manual reconciliation.',
      'Integrated SAP Business One Service Layer, SAP HANA, MSSQL, PostgreSQL, and Redis to enable cross-system synchronization and faster operational reporting for decision-making.',
      'Implemented role-based warehouse mobile workflows (Picker, Mantrap, Admin) with scan-policy enforcement (barcode/serial rules), mismatch handling, and completion controls to reduce fulfillment errors.',
      'Developed resilient scan execution with queue/batch submission, offline-tolerant local persistence, and handheld scanner integration (Honeywell APIs), improving throughput and reliability on the warehouse floor.',
      'Strengthened platform reliability and security through deployment automation, Alembic-integrated migrations, PM2 environment standardization, and Nginx/UFW hardening, reducing deployment risk and production drift.',
      'Added observability and performance controls (request tracing, dependency timing, structured logs, Redis caching) to isolate bottlenecks quickly and improve response times on high-read endpoints.',
      'Owned end-to-end production operations on Linux (builds, process supervision, env rollouts, health checks, and runbooks), improving service continuity and handover readiness.',
    ],
  },
  {
    company: 'GiveSuite',
    role: 'Full Stack Engineer (Contract)',
    start: 'September 2024',
    end: 'June 2025',
    duration: '10 months',
    location: 'Tel Aviv District, Israel',
    highlights: [
      'Executed a database migration strategy moving critical financial data from SAP HANA to PostgreSQL with zero data loss.',
      'Optimized internal payment modules to handle high-volume transactions (10,000+ records) efficiently.',
      'Collaborated on deployment pipelines for payment systems, ensuring security compliance and accessibility.',
      'Automated donor engagement workflows by integrating AI-driven APIs into existing CRM infrastructure.',
    ],
  },
  {
    company: 'Untapped Global',
    role: 'Frontend & Data Visualization Engineer',
    start: 'April 2022',
    end: 'May 2024',
    duration: '2 years 2 months',
    location: 'Nairobi County, Kenya',
    highlights: [
      'Bridged data systems with lightweight automation workflows, reducing manual data entry for investment operations.',
      'Deployed and customized Apache Superset instances for data visualization with real-time data ingestion.',
      'Integrated third-party financial APIs, ensuring reliable data processing and error handling for investor dashboards.',
      'Collaborated with backend teams to define API contracts and optimize data delivery for high-net-worth client interfaces.',
    ],
  },
  {
    company: 'DigitalOcean',
    role: 'Software Engineer (MLOps & GPU Computing)',
    start: 'January 2021',
    end: 'February 2022',
    duration: '1 year 2 months',
    location: 'New York, United States',
    highlights: [
      'Documented infrastructure best practices for deep learning with a focus on GPU optimization and Linux environments.',
      'Published technical guides on GPU benchmarking and mixed-precision training for practical developer adoption.',
      'Developed sample ML workflows demonstrating PyTorch integration with cloud-based GPU instances.',
      'Translated complex Generative AI concepts into implementation-focused guidance for the developer community.',
    ],
  },
]

function parseMonthYear(value: string) {
  const date = new Date(`${value} 1`)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return { year: date.getFullYear(), month: date.getMonth() }
}

function getTotalExperienceLabel() {
  const monthSet = new Set<number>()
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()

  for (const item of experiences) {
    const start = parseMonthYear(item.start)
    if (!start) continue

    const end =
      item.end.toLowerCase() === 'present'
        ? { year: nowYear, month: nowMonth }
        : parseMonthYear(item.end)

    if (!end) continue

    let y = start.year
    let m = start.month
    while (y < end.year || (y === end.year && m <= end.month)) {
      monthSet.add(y * 12 + m)
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
    }
  }

  const totalMonths = monthSet.size
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  return `${years} year${years === 1 ? '' : 's'} ${months} month${
    months === 1 ? '' : 's'
  }`
}

const totalExperience = getTotalExperienceLabel()

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Professional experience across infrastructure, developer tooling, and applied machine learning systems.',
  alternates: {
    canonical: '/work',
  },
  openGraph: {
    title: 'Work | daveclintonn',
    description:
      'Professional experience across infrastructure, developer tooling, and applied machine learning systems.',
    url: absoluteUrl('/work'),
    type: 'profile',
    images: [
      {
        url: absoluteUrl('/og?title=Work'),
        width: 1200,
        height: 630,
        alt: 'daveclintonn work preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work | daveclintonn',
    description:
      'Professional experience across infrastructure, developer tooling, and applied machine learning systems.',
    images: [absoluteUrl('/og?title=Work')],
  },
}

export default function WorkPage() {
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

        <main className="work-layout">
          <aside className="work-rail">
            <img src="/my-picture.jpg" alt="David Clinton" className="work-avatar" />
            <h1>WORK EXPERIENCE</h1>
            <p>{profile.role}</p>
            <p>{profile.location}</p>
            <p>Total Experience: {totalExperience}</p>
            <p className="work-summary">{profile.summary}</p>
          </aside>

          <WorkExperienceList experiences={experiences} />
        </main>
      </div>
    </div>
  )
}
