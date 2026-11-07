// Cover letter for Hostaway, Senior Frontend Engineer (100% Remote, EMEA).
module.exports = {
  output: "Hostaway_Senior_Frontend_Engineer_Cover_Letter.pdf",
  name: "David Clinton Hellen",
  headline: "Frontend Engineer",
  contact: [
    ["Mombasa, Kenya (EMEA, UTC+3, remote)", "+254 701 176 923", "daveclintonn@icloud.com"],
    ["daveclintonn.cc", "github.com/daveclinton", "linkedin.com/in/clintondavid46"],
  ],
  letter: {
    date: "November 7, 2026",
    greeting: "Dear Hostaway Hiring Team,",
    paragraphs: [
      "I am applying for the Senior Frontend Engineer role. I am based in Mombasa, Kenya, and have 6 years of software engineering experience, including more than four years building production applications in React and TypeScript.",
      "At Mika, I build the Next.js and React administration console behind warehouse, warranty, last-mile delivery, and automation workflows for several group companies. The console has more than 170 components, including a shared data-table library with server-driven infinite loading, URL-synced filters, and keyboard support. State comes from React Context, TanStack Query, and URL parameters, and cached queries are scoped to the selected company so that one tenant's data stays out of another's view. Your customers run several properties and channels from one product, so I expect much of this work to carry over directly.",
      "Your posting asks for someone who can handle performance and runtime problems, and much of my recent work involves them. Our operations dashboards run unattended on TV displays and refresh every 60 seconds, so views clear their polling timers and components disconnect their ResizeObservers on unmount. Live delivery screens poll only while a route is active or a truck is moving. The streaming interface for our AI assistant can cancel in-flight requests. For Studio1HQ, I also benchmarked React Native New Architecture and React Compiler on a physical Android device, comparing Release builds across launch time, interaction latency, and scroll frames.",
      "I also stay with software after it ships. At Mika, I monitor and support released services using health checks, structured logs, and written rollback steps. I have also carried on-call for production services. At Untapped Global, I worked on a team of 12 engineers, reviewed and approved pull requests, turned Figma designs into production interfaces, and published 3 React chart libraries for Apache Superset to npm.",
      "I use Claude Code daily. In [Claude can build the app. Then what?](https://www.daveclintonn.cc/blog/when-ai-can-build-the-app), I wrote about what is left for engineers once a tool can produce the first version: finding out where the software could fail the people using it, and being there when it breaks. That is the part of the job I would bring to Hostaway.",
      "I would welcome the chance to walk you through this work. Thank you for your time.",
    ],
    closing: "Sincerely,",
    signature: "David Clinton Hellen",
  },
};
