import Link from "next/link"
import type { ReactNode } from "react"
import { askAi, email, introduction, services, workLinks } from "@/lib/portfolio-data"

export type Signal = { title: string; body: ReactNode }

/** The home page: how David works at staff level, with the evidence, and what it costs. */
export const signals: Signal[] = [
  {
    title: "Start here",
    body: <>I’m David Clinton, a staff-level software engineer in Kenya. I take the problem nobody owns, design the system, build it across web, mobile, back end and servers, and run it. Pick a number, or click the dot at the bottom right to keep going.</>,
  },
  {
    title: "Give me the whole problem",
    body: <>I don’t need a ticket. Give me the mess: the process that’s slow, the system people fear, the AI idea nobody can ship. I’ll find out what’s really wrong, decide what to build and take it all the way to production.</>,
  },
  {
    title: "Ask my AI",
    body: <>Don’t take my word for it. I built an assistant that knows my work. Paste your job description and it will tell you what fits and what’s missing. <Link href={askAi.href}>Try to catch it out</Link>.</>,
  },
  {
    title: "I run the stack",
    body: <>At <a href={workLinks.mika}>Mika</a>, a group of home appliance companies with about 400 employees, I designed and built SapForge: the main back end, the staff web application, the Android warehouse app and an AI assistant. I deploy it. I support it. When it breaks, they call me.</>,
  },
  {
    title: "I change how the work gets done",
    body: <>Warehouse staff used to type documents into SAP by hand. Now they scan, the system checks, and SAP gets the record. Less typing, more checking. That’s what software is for.</>,
  },
  {
    title: "AI that’s allowed near real data",
    body: <>Anyone can make a demo. Mine is in production. It looks things up as the person asking, shows only what they’re allowed to see and waits for a yes before changing anything. If it quotes a figure it never looked up, it gets sent back to check.</>,
  },
  {
    title: "Back end",
    body: <>Python, Django, FastAPI, Go, Rust, PostgreSQL, Redis. Many companies on one platform, with each one’s data kept apart by rules the tests enforce. SapForge has about 1,600 automated tests on the back end alone.</>,
  },
  {
    title: "Never twice",
    body: <>An order that posts twice costs real money. I build for the moment the network dies halfway: each delivery update carries its own key, failures retry, and whatever can’t be fixed waits where a person can replay it.</>,
  },
  {
    title: "Front end",
    body: <>React, Next.js, Vue, Angular, TypeScript. I’ve built staff consoles, investor dashboards, payment screens and public sites. I design for the person doing it for the two hundredth time that day.</>,
  },
  {
    title: "Mobile",
    body: <>Kotlin, Flutter, React Native. Shipped to Google Play and the App Store. My warehouse app talks to Honeywell scanners and keeps working when the signal doesn’t, because warehouses have bad Wi-Fi.</>,
  },
  {
    title: "Infrastructure",
    body: <>Linux, Nginx, Docker, systemd, AWS. DNS, firewalls, TLS, backups. I run services on a company’s own servers and in the cloud, and I can follow a request from the browser to the database and find where it died.</>,
  },
  {
    title: "Merge means ship",
    body: <>Merge to main and the warehouse app versions itself, builds, signs and goes out to its release track. No release day. The cloud credentials it uses expire on their own. And there’s a written way back for when it goes wrong.</>,
  },
  {
    title: "I’ll undo my own work",
    body: <>I built the company’s automations as a separate Go service. It worked. It was also one more system to look after, so I moved it into the main platform and kept its history. Good architecture includes knowing when to have less of it.</>,
  },
  {
    title: "Own it before you understand it",
    body: <>I took over two live systems another developer left behind. I moved code into version control, took the passwords out, fixed what was hurting people and kept the shops and repair teams working.</>,
  },
  {
    title: "Make everyone else faster",
    body: <>I write the API specs, the conventions and the fake SAP server that lets app developers work without the real one. I wrote the handbook for the company’s systems. At <a href={workLinks.untapped}>Untapped Global</a> I reviewed code on a team of 12 engineers.</>,
  },
  {
    title: "Find what nobody is looking for",
    body: <>I went through a year of repair records, about 30,000 cases, against the stock and accounting behind them. I took 17 problems to the finance team, each with evidence. Nobody opened a ticket for that.</>,
  },
  {
    title: "Twenty minutes",
    body: <>That’s how long staff said one order took to type from one company’s records into another’s. Now the system does it. Every run can be previewed, and anything odd goes to a person.</>,
  },
  {
    title: "480,000",
    body: <>That’s about how many business documents a year are recorded by the SAP environment my systems connect to, across five group companies. Not all of them pass through my code. At that size, small mistakes don’t stay small.</>,
  },
  {
    title: "Money has to add up",
    body: <>At <a href={workLinks.givesuite}>GiveSuite</a> I moved financial data from SAP HANA to PostgreSQL. At <a href={workLinks.elementPay}>Element Pay</a> I built the screens for a stablecoin payments platform. Close enough doesn’t exist here.</>,
  },
  {
    title: "I learn your business fast",
    body: <>Appliances, payments, investment, schools, cloud computing. I built the dashboards investors used at <a href={workLinks.untapped}>Untapped Global</a> and worked across web, mobile and AWS for Tai Ora. <Link href="/experience">The full list is here</Link>.</>,
  },
  {
    title: "If it isn’t written, it isn’t finished",
    body: <>I wrote about GPUs for <a href={introduction.paperspaceWriting}>Paperspace</a> and write developer guides through <a href={introduction.studio1hq}>Studio1HQ</a>. I write down the decision too, so the next engineer can argue with it. The rest is on <Link href="/blog">my blog</Link>.</>,
  },
  {
    title: "What I charge",
    body: (
      <>
        {services.map((service) => (
          <span key={service.title} className="signal-line">{service.title}: {service.price}.</span>
        ))}
        <span className="signal-line">US dollars, typical ranges. <a href={email.href}>Email me for a quote</a>.</span>
      </>
    ),
  },
  {
    title: "Hand it to me",
    body: <>I’m open to staff roles, remote or willing to move, and to hard contract work. Bring the problem that keeps coming back. <a href={email.href}>Tell me about it</a>.</>,
  },
]
