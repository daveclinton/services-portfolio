import Link from "next/link"
import type { ReactNode } from "react"
import { askAi, email, introduction, workLinks } from "@/lib/portfolio-data"

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
    body: <><a href={workLinks.untapped}>Untapped Global</a> lets investors fund things that small businesses use to earn money. When I joined, the investment platform had no guided tour and investors could not see their portfolio in charts. I built both, so new investors could learn the platform and follow how their money was doing.</>,
  },
  {
    title: "Replacing manual work at Untapped Global",
    body: <>When I joined, the team checked each investor’s identity by hand, which is part of a process called KYC. I built the KYC screens, and we integrated third-party tools that helped prevent money laundering and detect fraud. I also connected Plaid so that investors could fund their investments on the platform.</>,
  },
  {
    title: "Turning data into decisions at Untapped Global",
    body: <>I worked on the internal platform that the investment and operations teams used every day. I connected financial information from other services, handled errors and helped bring in new data as it arrived. I also reviewed code in a team of 12 engineers and worked between design and back-end teams.</>,
  },
  {
    title: "My first tech job was in AI at Paperspace",
    body: <>Paperspace gave developers the powerful computers they needed to build AI. It <a href="https://www.prweb.com/releases/paperspace-launches-gradient-workflows-introduces-new-plans-to-compete-with-google-colab-pro-and-passes-500-000-users-873730589.html">passed 500,000 users</a> in 2021 and later became part of DigitalOcean. I am really proud that I worked in AI before ChatGPT made it mainstream.</>,
  },
  {
    title: "Helping developers build AI at Paperspace",
    body: <>Paperspace’s platform helped developers train AI models, automate the steps and make the models available to people. I ran experiments and wrote <a href={introduction.paperspaceWriting}>six articles</a> about teaching computers to recognize images and using powerful computers well. Developers could use my results to get more from the computers they were paying for.</>,
  },
  {
    title: "Supporting nonprofits at GiveSuite",
    body: <><a href={workLinks.givesuite}>GiveSuite</a> helps nonprofits raise money and look after their donors. I rebuilt an older system as a new web experience and moved its financial information to a new database without losing records. I also improved how it handles large numbers of payments and used AI to reduce the manual work of following up with donors.</>,
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
    // Keep in sync with the contracting-rate-2026 evidence record.
    body: <>I build AI agents that answer questions and do repeated work using your company’s own data. I connect the tools you already use, so your team stops copying information between them. I also build web and mobile products from the first idea to launch and support them afterwards. Most of this work costs $45 to $75 an hour, and you can <a href={email.href}>email me for a quote</a>.</>,
  },
  {
    title: "Work with me",
    body: <>I am open to full-time roles and contract work. You can <a href={email.href}>email me</a> about the problem you want to solve, and I will tell you how I would approach it. My <Link href="/experience">work experience</Link> has the full list of companies and dates.</>,
  },
]
