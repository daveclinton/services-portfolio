import Link from "next/link"
import type { ReactNode } from "react"
import { askAi, email, introduction, services, workLinks } from "@/lib/portfolio-data"

export type Signal = { title: string; body: ReactNode }

/**
 * The home page. Very simple English about the value the work brings.
 * Avoid slogans, colons, one-word sentences and lists of technologies.
 */
export const signals: Signal[] = [
  {
    title: "Start here",
    body: <>I’m David Clinton, a Software Engineer based in Nairobi, Kenya. I spend most of my days solving problems that we see every day, taking ownership of the problem nobody owns, and designing systems that run and scale. On this site, pick a number or click the dot at the bottom right to keep going through my facts list.</>,
  },
  {
    title: "The problems I take on",
    body: <>Many businesses have a slow process that everyone has learned to live with. I talk to the people doing the work and find out what slows them down. Then I build something that fixes it and look after it once people start using it.</>,
  },
  {
    title: "Ask my AI",
    body: <>I built an assistant that answers questions about my work. You can paste a job description and it will tell you which parts match my experience and which parts I have not done. <Link href={askAi.href}>You can try it here</Link>.</>,
  },
  {
    title: "The value I bring to Mika",
    body: <><a href={workLinks.mika}>Mika</a> sells home appliances in Kenya and Rwanda and has about 400 employees. Because of my work, people there spend less time typing the same information twice. They can also find answers in company records by asking a question. I support these systems, so the teams know who to call when something goes wrong.</>,
  },
  {
    title: "Saving people time",
    body: <>Staff at Mika told me that one order took about 20 minutes to copy from one company’s records to another. I automated that work, and people can check what will happen before anything is saved. Unusual orders still go to a person.</>,
  },
  {
    title: "Keeping records correct",
    body: <>A business makes decisions from its records, so a wrong number can cost money. I reviewed about 30,000 repair cases at Mika and reported the problems I found to the finance team with evidence. They could then see what needed to be corrected.</>,
  },
  {
    title: "Making AI safe to use at work",
    body: <>People need to trust an AI assistant before they use it with company information. The one I built for Mika shows each person only what they are allowed to see. It also asks for approval before it changes anything, so people stay in charge.</>,
  },
  {
    title: "Making sure work is not lost",
    body: <>Every sale, delivery and payment has to be saved correctly, even when the connection fails. I build the part of the system that customers do not see. It keeps unfinished work, tries again and avoids entering the same thing twice.</>,
  },
  {
    title: "Making software easy to use",
    body: <>Good software helps people finish their work without asking for help. I build the screens that employees, customers and investors use. I learn how they work first, so the most common task is the easiest one to do.</>,
  },
  {
    title: "Helping people who work away from a desk",
    body: <>Some people do their work while standing, driving or visiting customers. I build phone apps that let them record the work where it happens. The apps can keep working when the internet is slow and send the information later.</>,
  },
  {
    title: "Keeping systems available",
    body: <>A business stops earning when the system it depends on stops working. I set up the servers, protect the information, keep backups and check that everything is healthy. When there is a problem, I find the cause and bring the system back.</>,
  },
  {
    title: "Improving software without stopping work",
    body: <>Teams should get improvements without worrying that the next update will stop their work. I automate how updates are tested and released. I also write down how to return to the earlier version if an update causes a problem.</>,
  },
  {
    title: "Looking after systems I did not build",
    body: <>When a developer leaves, the business still needs the system they built. I took over two of these systems at Mika and kept them running for the people who depend on them. I also made the passwords safer and fixed problems that users reported.</>,
  },
  {
    title: "Handling work at a large scale",
    body: <>The business records my systems connect to at Mika grow by about 480,000 documents a year across five companies. Some of those documents come from other tools. I design for that amount of work because a small mistake can be repeated many times.</>,
  },
  {
    title: "Helping other people do their work",
    body: <>A business should not depend on one person remembering everything. I wrote a handbook that explains how Mika’s systems work and what to do when they fail. I also prepare guides and test systems so that other developers can work safely.</>,
  },
  {
    title: "Keeping things simple",
    body: <>Every extra system costs a business time and money to look after. I once built a separate system that worked well, then moved it into the main one because that was easier to support. The business kept its history and had one less thing to maintain.</>,
  },
  {
    title: "Helping businesses handle payments",
    body: <>People expect a payment or donation to work the first time. I improved online payment experiences for <a href={workLinks.givesuite}>GiveSuite</a> and <a href={workLinks.elementPay}>Element Pay</a>. At GiveSuite, I also moved financial information to a new system.</>,
  },
  {
    title: "Helping investors understand their money",
    body: <>Investors at <a href={workLinks.untapped}>Untapped Global</a> needed to see how the small businesses they funded were doing. I turned complex information into clear charts and reports. That helped investors and the internal team explore the information for themselves.</>,
  },
  {
    title: "Supporting education",
    body: <>I worked on the Tai Ora web and mobile apps, which were introduced in three schools. I added an AI chat so people could ask questions inside the app. I also helped put the app in front of users on their phones.</>,
  },
  {
    title: "Explaining technical ideas",
    body: <>Companies lose users when people cannot understand how to use their product. I write practical guides for developers through <a href={introduction.studio1hq}>Studio1HQ</a>, and I wrote for <a href={introduction.paperspaceWriting}>Paperspace</a>. You can read more on <Link href="/blog">my blog</Link>.</>,
  },
  {
    title: "What I charge",
    body: (
      <>
        {services.map((service) => (
          <span key={service} className="signal-line">{service}</span>
        ))}
        <span className="signal-line">
          These prices are in US dollars and depend on the size of the work. <a href={email.href}>Email me for a quote</a>.
        </span>
      </>
    ),
  },
  {
    title: "Work with me",
    body: <>I am open to full-time roles and contract work. You can <a href={email.href}>email me</a> about the problem you want to solve, and I will tell you how I would approach it. My <Link href="/experience">work experience</Link> has the full list of companies and dates.</>,
  },
]
