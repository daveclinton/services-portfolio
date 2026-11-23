import Link from "next/link"
import type { ReactNode } from "react"
import { askAi, email, introduction, services, workLinks } from "@/lib/portfolio-data"

export type Signal = { title: string; body: ReactNode }

/** The home page: what David believes, what he has built and what it costs. */
export const signals: Signal[] = [
  {
    title: "Start here",
    body: <>I’m David Clinton, a software engineer in Kenya. I turn AI ideas into software people can rely on. This is a list of what I believe, what I’ve built and what I charge. Pick a number, or click the dot at the bottom right to keep going.</>,
  },
  {
    title: "The demo is the easy part",
    body: <>Anyone can make AI look good for five minutes. Then real people show up with messy questions, missing data and a deadline. I work on everything that happens after the demo.</>,
  },
  {
    title: "AI still needs an engineer",
    body: <>A model is one part. It also needs your data, your rules, a way to fail safely and somebody who answers when it breaks. Most of the work is ordinary engineering done well. That’s my job.</>,
  },
  {
    title: "Connect it or forget it",
    body: <>An assistant that can’t reach your systems is a chat toy. I connect AI to the databases, business software and documents you already have. You shouldn’t have to replace everything to try something.</>,
  },
  {
    title: "Some doors stay locked",
    body: <>If you can’t open a record yourself, the AI shouldn’t open it for you. The assistant I built at Mika looks things up as the person asking. They see what they’re allowed to see. Nothing more.</>,
  },
  {
    title: "Ask first",
    body: <>Reading is cheap. Changing things isn’t. My assistants prepare the change, show it and wait. Nothing is sent until a person says yes.</>,
  },
  {
    title: "Don’t guess",
    body: <>A confident wrong number is worse than no number. When an answer at Mika has figures in it and nothing was looked up, the system sends the AI back to check.</>,
  },
  {
    title: "Test what it says",
    body: <>While testing the assistant on this site, it claimed 400 people use my systems every day. Nobody had ever counted. I fixed it before it went live. You find these things by asking hard questions on purpose.</>,
  },
  {
    title: "Boring keeps working",
    body: <>Logs. Backups. Health checks. Written steps for undoing a bad release. Nobody claps for these, and everybody wants them when something breaks. I’ve been on call. I set them up early.</>,
  },
  {
    title: "Somebody has to touch the old system",
    body: <>New is fun. Old is where the business lives. I took over two systems another developer left behind, moved code into version control, took the passwords out and wrote the handbook.</>,
  },
  {
    title: "Twenty minutes is a long time",
    body: <>Staff told me one order took about 20 minutes to type from one company’s records into another’s. So I automated it. Every run can be previewed, and anything odd goes to a person.</>,
  },
  {
    title: "480,000",
    body: <>That’s about how many business documents a year are recorded by the SAP environment my systems connect to, across five group companies. Not all of them pass through my code. At that size, small mistakes don’t stay small.</>,
  },
  {
    title: "Where I work",
    body: <><a href={workLinks.mika}>Mika</a>, a group of home appliance companies in Kenya and Rwanda with about 400 employees. I built its main back-end system and staff web application, and an AI assistant that runs inside it. <Link href="/experience">The full list is here</Link>.</>,
  },
  {
    title: "Money has to add up",
    body: <>At <a href={workLinks.givesuite}>GiveSuite</a> I moved financial data from SAP HANA to PostgreSQL. At <a href={workLinks.elementPay}>Element Pay</a> I built the screens for a stablecoin payments platform. Payments teach you to care about the last cent.</>,
  },
  {
    title: "Show, don’t summarize",
    body: <>At <a href={workLinks.untapped}>Untapped Global</a> I built the dashboards investors used to follow the small businesses they funded. I also published three chart packages so other people could build their own.</>,
  },
  {
    title: "Schools too",
    body: <>For Tai Ora I worked on web and mobile apps with AI chat, and put the back end on AWS. I don’t stick to one industry. The problems rhyme.</>,
  },
  {
    title: "Write it down",
    body: <>I wrote about GPUs for <a href={introduction.paperspaceWriting}>Paperspace</a> and I write developer guides through <a href={introduction.studio1hq}>Studio1HQ</a>. I build the thing first, then explain it. The rest is on <Link href="/blog">my blog</Link>.</>,
  },
  {
    title: "Nobody in between",
    body: <>I talk to the people who will use it: finance, shops, repair teams, whoever has the problem. Fewer handoffs. Fewer surprises.</>,
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
    title: "Ask my AI",
    body: <>I built an assistant that answers questions about my work. Paste a job description and it will tell you what fits and what’s missing. <Link href={askAi.href}>Try to catch it out</Link>.</>,
  },
  {
    title: "Got something stuck?",
    body: <>An AI idea that never left the demo. A slow process. A system nobody wants to touch. <a href={email.href}>Tell me about it</a>.</>,
  },
]
