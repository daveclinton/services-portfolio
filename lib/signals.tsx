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
    body: <><a href={workLinks.mika}>Mika</a> sells home appliances in Kenya, Uganda and Rwanda. Its employees use the systems I build and support to serve thousands of customers across the three countries. I also took over two older systems and wrote a handbook, so the company does not depend on one person.</>,
  },
  {
    title: "Saving time and correcting records at Mika",
    body: <>One order used to take about 20 minutes to copy from one company’s records to another, so I automated it. I also reviewed about 30,000 repair cases. I gave the finance team evidence of the problems I found, so they could see what needed to be corrected.</>,
  },
  {
    title: "Making AI safe to use at Mika",
    body: <>Employees can ask an AI assistant a question and get an answer from live company records. It shows each person only what they are allowed to see. It also asks for approval before it changes anything, so people stay in charge.</>,
  },
  {
    title: "My favorite role was at Untapped Global",
    body: <><a href={workLinks.untapped}>Untapped Global</a> finances things like vehicles and solar equipment that small businesses use to earn money. I built the website and the dashboards that its investors used. They could see how the businesses they funded were doing.</>,
  },
  {
    title: "Helping Untapped Global teams explore their data",
    body: <>At Untapped Global, the investment and operations teams needed answers from a large amount of information. I set up a tool where they could explore it and build their own charts. I also published three chart packages that other developers can use for free.</>,
  },
  {
    title: "Working in a larger team at Untapped Global",
    body: <>I worked with a team of 12 engineers at Untapped Global. I turned the designers’ work into finished screens, agreed with other engineers on how information would be shared, and reviewed their code. This helped us build the same product together.</>,
  },
  {
    title: "Teaching developers at Paperspace",
    body: <>Paperspace rented out powerful computers for building AI, and it is now part of DigitalOcean. I wrote six articles <a href={introduction.paperspaceWriting}>under my name</a>. They helped developers learn how computers recognize images and faces, and how to start building with AI.</>,
  },
  {
    title: "Helping Paperspace readers choose the right computer",
    body: <>Powerful computers are expensive when they are used badly. At Paperspace, I explained how to measure their speed and memory and how to use more of what they can do. Readers could use this to choose a computer that fits their work.</>,
  },
  {
    title: "Supporting nonprofits at GiveSuite",
    body: <><a href={workLinks.givesuite}>GiveSuite</a> helps nonprofits raise money and look after their donors. I rebuilt an older system as a new web experience and moved its financial information to a new database without losing records. I also improved how it handles more than 10,000 payment records.</>,
  },
  {
    title: "Making digital payments clear at Element Pay",
    body: <><a href={workLinks.elementPay}>Element Pay</a> helps businesses in Africa use digital dollars and receive money on their phones. I built the screens that explain and support invoices, collections and cash withdrawals. I also built the pages that help developers connect to it.</>,
  },
  {
    title: "Helping developers use new products at Studio1HQ",
    body: <><a href={introduction.studio1hq}>Studio1HQ</a> helps technology companies reach developers. I test a product, build a working example and write a guide that shows developers how to use it. This helps them decide if the product fits their work.</>,
  },
  {
    title: "Supporting schools with Tai Ora",
    body: <>I worked on the Tai Ora web and mobile apps, which were introduced in three schools. I added an AI chat so that people could ask questions inside the app. I also helped release it on the Apple and Google app stores.</>,
  },
  {
    title: "Running the ICAD conference from one place",
    body: <>I built the web and mobile apps for the ICAD conference. Organizers can manage papers, reviewers, rooms and attendance in one place. Attendees can use the mobile app to follow the conference.</>,
  },
  {
    title: "Building new products",
    body: <>I have built early versions of products from the first screen to the server behind it. They include Aqua Prana, Seep Baby and SnapList. Seep Baby connects a phone to a physical device, and all of this work taught me to learn a new field quickly.</>,
  },
  {
    title: "Building mobile apps",
    body: <>I build mobile apps that are able to work in different internet connectivity strengths. The apps save the work on the phone and send it when the connection allows. This way, we can always keep our systems in sync.</>,
  },
  {
    title: "Designing systems that recover",
    body: <>I design systems so that the business can recover when one part fails. I plan the servers, network, security and backups before people depend on them. I also monitor the systems, which helps me find the cause of a problem and restore the service.</>,
  },
  {
    title: "Releasing software safely",
    body: <>I keep every change in version control and release it through an automated process. Before a release, the process backs up the data. After the release, it checks that the system works and returns to the previous code if the checks fail. Mobile updates can go to a test group before everyone else receives them.</>,
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
