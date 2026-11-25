# Portfolio + Ask AI

An open-source developer portfolio with an evidence-grounded AI assistant. Built with Next.js, Go, PostgreSQL and pgvector. Use it to publish your work, answer questions about your experience, compare a job description with verified projects, and prepare an interview brief.

The repository includes David Clinton's portfolio content as a working example. Fork it, replace the content and knowledge base with your own, and run it locally or deploy the frontend and API separately.

[Live portfolio](https://www.daveclintonn.cc) · [Ask AI](https://www.daveclintonn.cc/ask-ai) · [MIT license](LICENSE)

## Features

- **Grounded conversations:** answers use the published knowledge base and confirmed evidence; public evidence links can be expanded below a response.
- **Role comparison:** paste a job description for a requirement/evidence/gap comparison. Demonstrated experience, transferable skills and unverified requirements are kept distinct; the assistant does not score or make hiring decisions.
- **Interview briefs:** create role-specific questions tied to verified projects and identify what an interviewer should validate.
- **Project discovery:** scope a potential project through six questions, review or edit the answers, then generate a proposed first release, data/integration needs, relevant verified work and open questions. Continue refining the brief in chat; scope, pricing, availability and delivery dates require David's review.
- **Staged task discovery:** the composer comes first, with only Explore my work, Hiring, and Plan a project shown underneath. Choosing a category reveals its task rows and a clearable composer mode. Choosing a task or typing hides the suggestions. Tasks remain available during a conversation.
- **Summary-first answers:** a short answer and a compact result card introduce projects, role comparisons, architecture, career history or a proposed brief. Cards preview up to three item titles, with brief contribution descriptions for projects. A direct Sources action opens referenced passages and their associated result items. Opening the result reveals individual details on request. Recorded evidence-review dates appear when available, and saved brief edits still travel with follow-ups.
- **Context-aware follow-ups:** two suggested next questions accompany completed answers. Selected items and saved brief edits are included with the next question as visitor context; selections and views survive a same-tab reload. Copying a brief includes saved edits and its proposal disclaimer.
- **Question refinement:** sent text and discovery categories clear from the composer, which becomes a labelled follow-up input while actual workflows remain visible. Edit any question without changing the visible conversation until sending; cancel restores the previous draft. Sending a revision replaces later turns in the tab's conversation. Regenerate explicitly requests another answer to the last question.
- **Sources for plain answers:** even without a project card or diagram, completed text answers can open retrieved excerpts, public links and available review dates. The inspector labels this as retrieved material rather than claim-by-claim verification; older and interrupted responses retain their link fallback.
- **Follow along by email:** a short invitation opens a guided email-and-review flow on Writing, article footers and `/subscribe`. A confirmation email completes signup; existing subscribers see their own result without another email. Subscriber lists, confirmation records and unsubscribe handling live in our PostgreSQL database, separately from chat consent. RSS remains available.
- **Reading-aware streaming:** follow a new answer, pause to read or select earlier text, and jump back to the latest response. The mobile composer follows the visible viewport above the keyboard.
- **Evidence-only fallback:** when generation is unconfigured or the provider reports billing, credential or availability problems, show clearly labelled excerpts instead of pretending to generate an assessment.
- **Useful owner notifications:** optional email for successful hiring/pricing/contact interest, critical provider incidents and a warning near the application request budget. Greetings and ordinary browsing do not email by default.
- **Operational controls:** per-visitor/IP/site limits, bounded conversation context, cancellation, recovery cooldowns, structured logs and local regression evaluations.
- **Portfolio publishing:** MDX articles, RSS, metadata, light/dark themes and shared design tokens.
- **Numbered reading:** Home, Experience and Writing start with every item closed, including on return visits. A direct item link opens its selection. Articles reuse the same numbered, one-section-at-a-time reader with shareable section anchors and a next-section control. Ask AI keeps its chat flow and mobile composer while sharing the homepage's typeface, responsive text size and reading measure.
- **Mobile focus and scrolling:** a shared visual-viewport coordinator keeps focused fields clear of the keyboard and fixed navigation across signup, chat, project discovery, newsletter editing and result dialogs. Numbered selections wait for disclosure layout before a native smooth scroll to the heading; a new scroll or keyboard action cancels pending repositioning. Reduced motion uses instant scrolling. Newsletter signup mounts and focuses the email field during the tap, checks availability while readers type, and preserves the address through review and Back.

## Interface references

The newsletter writing canvas follows [Ghost's visual editor](https://ghost.org/help/using-the-editor/): edit the subject and body in place, use formatting and media controls, then preview/test before delivery. [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) keeps image insertion in a short address → description → review flow. Tiptap uses the existing portfolio buttons, tooltips, article typography, and theme tokens; its [Next.js integration](https://tiptap.dev/docs/editor/getting-started/install/nextjs) and [Markdown API](https://tiptap.dev/docs/editor/markdown/getting-started/basic-usage) provide the implementation reference. This frontend release retains the existing Markdown API, supports hosted HTTPS images, and preserves unsupported legacy formatting in Markdown mode. Device uploads and live blog publishing require the later backend phase.

The portfolio lists and article reader follow [37signals' numbered index](https://37signals.com/) and [directly linked item](https://37signals.com/01): choose an item, read it in place, and use the dot to continue. Article sections come from existing Markdown headings; code, tables, media and interactive content remain intact. Only the selected section is expanded, and the article retains its canonical address and one background color throughout reading. This uses the existing native disclosure component and site palette. Ask AI adopts the same typography and spacing while preserving its conversation and keyboard behavior.

The current discovery flow follows the two Grok desktop screenshots supplied for the November 2026 redesign: composer first, a few category rows, then the selected category's suggestions. [NN/g's progressive-disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports revealing specialized choices only when requested. Results follow Grok's [title-and-open result cards](https://docs.x.ai/grok-bot/files-and-results), with item disclosure informed by the [GOV.UK accordion](https://design-system.service.gov.uk/components/accordion/) and [details](https://design-system.service.gov.uk/components/details/) guidance. Essential findings and caveats stay visible in chat. The app retains its own components, icons and tokens; references inform behavior rather than branding.

The follow-up revision uses [Google's concise conversation language](https://developers.google.com/assistant/conversation-design/language) and [nonduplicating suggestion guidance](https://developers.google.com/assistant/conversation-design/chips), [GOV.UK's input-label guidance](https://design-system.service.gov.uk/components/text-input/), and [Microsoft HAX correction guidance](https://www.microsoft.com/en-us/haxtoolkit/guideline/support-efficient-correction/). The existing Sources view maps canonical retrieved passages to result items; it does not independently verify every generated claim.

The glass controls follow [Glassy UI's dock-and-surface approach](https://github.com/alexburlis/glassyui), adapted to this app's components and tokens without adding a package. [Apple's material guidance](https://developer.apple.com/design/human-interface-guidelines/materials) informs the separation between glass controls and readable, solid content. Browser-specific SVG refraction is intentionally omitted; browsers without backdrop-filter support keep solid surfaces.

The numbered reader uses native `details` disclosures and respects reduced motion. Its content is rendered on the server; section-anchor opening, saved color preferences and the next-section control enhance it after hydration. Saved preferences never reopen a list item on a clean visit.

Focus and keyboard handling follow [React Aria's mobile visual-viewport approach](https://react-aria.adobe.com/blog/building-a-combobox), [Chrome's viewport-resize guidance](https://developer.chrome.com/blog/viewport-resize-behavior), and [W3C Focus Not Obscured guidance](https://www.w3.org/WAI/WCAG22/Techniques/failures/F110.html). The existing viewport component coordinates every page; native scrolling remains in charge of document, nested and dialog scrollers. It corrects keyboard resize without repeatedly pulling a reader back while they scroll. Fixed reader controls are hidden during text entry, and overlay-keyboard space is added only to ordinary scrolling pages.

Browsing chat task categories focuses the chosen suggestions without opening the keyboard. Choosing a task, editing a question, preparing a follow-up, or returning to the conversation explicitly restores the appropriate input. Native Tab navigation, Enter/Shift+Enter, IME composition, and existing Escape/stop behavior are preserved.

The email field is rendered synchronously on Subscribe before any availability request, following [WebKit's user-gesture requirement for programmatic keyboard focus](https://bugs.webkit.org/show_bug.cgi?id=195884). Later availability updates keep that same field mounted; Next remains unavailable until the check succeeds. Focus uses [`preventScroll`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/focus), then one coordinated reveal. Repeated taps also reveal an already-focused field; viewport panning cannot cancel a pending keyboard-resize correction. Disclosure positioning waits for [layout transition completion](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finished), reserves the sticky navigation's full height, and checks title visibility again on native [`scrollend`](https://developer.mozilla.org/en-US/docs/Web/API/Document/scrollend_event). The numbered list opts out of [scroll anchoring](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_anchoring/Overview) so closing a preceding section does not compete with title positioning. Reader input cancels the pending correction. No scroll library, decorative reveal effects, or replacement keyboard behavior is added.

## Architecture

```text
Next.js frontend (React, Tailwind, shadcn/Base UI, Prompt Kit)
    │ POST /ask-ai/chat — Server-Sent Events
    ▼
Go API ── PostgreSQL + pgvector
    ├── OpenAI: retrieval planning, streamed answers, optional embeddings
    ├── optional self-hosted embeddings
    └── optional Sendy: qualified visitor and operational notifications

Offline Python/Django pipeline → Markdown ingestion, audits and retrieval evals
```

All HTTP APIs run in `backend/`. `knowledge-backend/` is an offline data pipeline, not a second web server. The whole knowledge base forms a stable reference prefix; hybrid retrieval selects relevant evidence. Reference data and visitor text remain separate from application policy. See [backend architecture and deployment](backend/README.md).

Interactive clients opt in to a structured answer envelope in the same streamed generation call. The API streams its readable `answer` field as text, then emits a validated `view` with canonical evidence; it never sends executable model-generated UI. Planning, retrieval, writing and formatting status events reflect actual server work. Plain clients retain text streaming, and failed or evidence-only responses do not expose interactive answer controls. Fixed published career and assistant-implementation facts also receive inspectable source IDs for timelines and architecture.

## Requirements

- Node.js 22.18+ and the pnpm version declared in `package.json`.
- Docker with the Compose plugin for local PostgreSQL and the API.
- Go 1.27.3+ to run or test the API outside Docker.
- Python 3.12+ for knowledge ingestion; Python 3 is also used by the backend eval harness.
- An OpenAI API key for generated answers. Without one, ingested knowledge can still be explored in evidence-only mode.
- Sendy credentials only if you want email notifications.

## Quick start

```bash
git clone https://github.com/daveclinton/services-portfolio.git
cd services-portfolio
pnpm install
cp .env.example .env.local
cp backend/.env.example backend/.env
```

The frontend example points to `http://localhost:8080`. Edit `backend/.env` to add `OPENAI_API_KEY` if you want generated answers. The example database password is for local development; set a strong password and matching database URL for your deployment. Do not commit populated environment files.

Start PostgreSQL and the API:

```bash
cd backend
make up
cd ..
```

Ingest the bundled knowledge so retrieval has data:

```bash
python3 -m venv knowledge-backend/.venv
knowledge-backend/.venv/bin/pip install -r knowledge-backend/requirements.txt
cd backend
make db-ingest
cd ..
```

Start the frontend in another terminal:

```bash
pnpm dev
```

The frontend serves at `http://localhost:3000`; the API serves at `http://localhost:8080`. `GET /healthz` checks the API/database, not the validity of the model credential. Ask a real question to validate the complete generation path.

## Make it your own

| What to change | Location |
| --- | --- |
| Name, links, starter questions and copy | `lib/portfolio-data.ts` |
| Home content and portrait | `app/page.tsx`, `public/` |
| Articles | `content/blog/` |
| Colors, typography and shared tokens | `app/globals.css` |
| Knowledge content | `professional-knowledge/knowledge/` |
| Fixed assistant facts and answer policy | `backend/internal/askai/site_facts.md`, `generation.go` |
| API origin | `.env.local`, deployment environment |
| Provider, email and request limits | `backend/.env` |

Replace the included personal content and fixed site facts before publishing your own deployment. Run ingestion again after changing the Markdown knowledge base. The API refreshes its cached knowledge and embedding index periodically. The [offline pipeline guide](knowledge-backend/README.md) covers ingestion, evidence audits and migrations.

## Notifications

Email is optional. Configure `SENDY_API_KEY`, `SENDY_ALERT_TO_EMAIL` and `SENDY_SENDER_EMAIL` in the backend environment.

Visitor notifications are short notes containing the question and an answer preview,
without device details, confidence scores, IDs or the full generated result.
Confirmation emails and alerts share a minimal adaptation of [Postmark's Plain
templates](https://github.com/ActiveCampaign/postmark-templates), using the
portfolio's default blue/white palette and serif reading fallback. The MIT notice
is retained with the template and in the API image.

The invitation keeps the personal tone of [Cassidy Williams' newsletter](https://cassidoo.co/newsletter/):
explain what readers receive without a marketing pitch. RSS remains available
through feed discovery and the unavailable-state alternative.
The form follows [Typeform's welcome screen](https://help.typeform.com/hc/en-us/articles/360052366812-Welcome-Screen)
and [one-question sequence](https://help.typeform.com/hc/en-us/articles/360053660271-My-first-form):
one invitation and Subscribe button, then an email question, a short review with
consent, and an outcome-specific ending. Progress and Back appear only after starting.

Newsletter subscriptions belong to this application, stored in PostgreSQL alongside
confirmation and opt-out records. [Sendy](https://usesendy.com/docs/api/send-email)
provides transactional email delivery; it does not manage our list. The API creates
its local newsletter tables at startup without enrolling anyone or sending mail.
Signup checks local membership, sends a signed confirmation link valid for 48 hours,
and enrolls only after confirmation. Existing members receive no repeat email;
opt-outs are preserved and cannot be reversed by signup or an old confirmation link.
Each broadcast includes a signed unsubscribe link back to this API.

Set `SENDY_API_KEY`, `SENDY_SENDER_EMAIL`, `SENDY_SENDER_NAME`, and
`NEWSLETTER_PUBLIC_API_URL` (the publicly reachable API origin). Keep
`RATE_LIMIT_SECRET` stable and at least 32 characters; it signs email links.
Verify the sending domain in Sendy and provide sending credits before enabling mail.
`SENDY_ALERT_TO_EMAIL` is the owner notification destination and default test recipient.
Signup, scheduled delivery and operational alerts are enabled automatically when
email credentials are configured; there are no boolean environment switches.
Existing preference links remain usable without delivery credentials. `SITE_URL`
is the frontend origin.

Write future notes at `/admin/newsletters` after configuring the private dashboard
(see [owner setup](backend/README.md#newsletter-writing-dashboard)). It retains saved
Markdown drafts, email previews, owner-only tests, send now, Nairobi-time scheduling
and cancellation. The flow follows
[Ghost's write → preview/test → delivery → confirmation sequence](https://ghost.org/help/delivering-emails/),
using existing portfolio components and the shared email template. Scheduling and
recipient delivery jobs are durable local records. Only confirmed subscribers are
eligible; opt-outs are checked again before submission to Sendy.

For the cutover, export confirmed subscribers with consent timestamps and all
unsubscribed/blocked addresses from the previous provider. Use the
[local subscriber importer](backend/README.md#subscriber-migration) before switching
production traffic. Existing provider campaigns remain historical and cannot be
resent through the new adapter. Cancel outstanding schedules in the old provider.

Signup currently accepts up to five attempts
per network per hour and 100 per API process per day, with a 15-minute cooldown
per email. These controls reuse the existing in-memory limiter and assume one API
instance; network and email rate-limit keys are hashed and temporary.

The dashboard requires GitHub sign-in restricted to the configured numeric owner
ID. It activates automatically when its GitHub credentials are configured.
Drafts and delivery operations persist in Postgres;
uncertain provider responses require a status check instead of an automatic resend.
A queued broadcast displays **Submitted for delivery** until every eligible recipient's
Sendy job reports provider acceptance. **Sent** does not guarantee inbox delivery.
Timed-out per-recipient requests retry with the unchanged payload and idempotency key.
Insufficient credits leave delivery pending; terminal failures show **Delivery stopped**.

| Setting | Behavior |
| --- | --- |
| `SENDY_CONVERSATION_ALERTS=important` (default) | One email per conversation after a successful hiring, pricing or contact-interest turn; the first greeting does not consume that alert. |
| `SENDY_CONVERSATION_ALERTS=all` | One email after a successful conversation turn, including ordinary browsing. |
| `SENDY_CONVERSATION_ALERTS=off` | No visitor-conversation emails. |
| Operational alerts (automatic) | Credential/billing incident alerts and an application daily request-budget warning at about 80% usage. |

Failed, stopped, policy-blocked, bot and evidence-only responses do not qualify for visitor-interest alerts. Operational emails contain status and recovery guidance, not visitor conversation text. Each operational event kind is deduplicated for an hour per API process; failed sends release the claim for a later retry. Restarting the API resets those in-memory operational claims. Visitor notification claims are stored in PostgreSQL.

Successful project-scoping conversations qualify as contact interest under the same notification policy. Discovery answers remain on the page until the visitor reviews them and selects **Generate project brief**, with the existing conversation-storage consent required before sending. The generated brief and subsequent conversation use the same 30-day retention policy as chat.

## Credits, limits and recovery

The application does **not** display or infer your remaining OpenAI prepaid balance. Its daily request counter is a separate application limit, not a dollar balance or account-wide cost report.

- Set provider-side spend alerts and any appropriate spending limits in the OpenAI project/organization settings. [OpenAI spend-limit guidance](https://developers.openai.com/api/docs/guides/spend-limits).
- Configure prepaid auto-reload in the provider's billing dashboard if desired. This repository never purchases credits or changes your billing settings. [OpenAI prepaid billing](https://help.openai.com/en/articles/8264644-setting-up-and-managing-prepaid-api-billing).
- OpenAI's [Costs API](https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs) reports usage costs using administrative credentials; it is not used as a prepaid-balance lookup here.
- An exhausted credit balance or billing/spend limit triggers a deduplicated operational email when configured. The API pauses provider calls and uses structured retrieval for evidence-only replies.
- Billing/credential failures use a configurable cooldown (`AI_PROVIDER_COOLDOWN_SECONDS`, default 300). One subsequent request can probe recovery; other requests continue to use the fallback. A successful generated answer restores normal operation. Transient rate-limit/provider failures use a shorter cooldown.
- After replacing an environment key, recreate the API container so it loads the new credential. Adding provider credits does not require a code change.

The circuit and request limits are in process memory and assume the existing single-instance deployment. A multi-replica deployment needs shared coordination before those controls can be treated as global.

## Privacy and safety

The assistant requires explicit consent before storing conversations. Questions, responses and coarse device information are retained for 30 days; raw IP addresses and full user-agent strings are not stored in conversation records. Qualified conversation emails may include the relevant question and response. Avoid confidential job descriptions or private information. Review the [privacy page](https://www.daveclintonn.cc/privacy) and adapt its copy to your own deployment.

Application policy, role-spoofing checks and the existing structured classifier provide application-specific defenses. They are not a guarantee against every prompt-injection attack or hallucination. Role comparisons are evidence summaries for human review, not automated hiring decisions.

## Tests and evaluations

```bash
pnpm lint
pnpm test
pnpm build
cd backend
make test
```

`make test` runs Go vet/tests and the Python eval-harness unit tests. A Postgres retention test is opt-in with `ASKAI_TEST_DATABASE_URL` and uses its own temporary schema. Live model evaluations require a local API with email disabled and can incur provider usage:

```bash
python3 evals/ask.py http://127.0.0.1:8080 evals/questions.txt
python3 evals/ask.py http://127.0.0.1:8080 evals/hiring.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/project-scoping.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/interactive.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/guardrails.json --json
```

See [answer evaluation guidance](backend/evals/README.md). Live cases are targeted regressions, not a comprehensive security or grounding certification.

## Deployment

Deploy Next.js to Vercel or a compatible Node host, setting `NEXT_PUBLIC_API_URL` to your API origin. Deploy the Go API and PostgreSQL with Docker Compose behind nginx/TLS. Do not point your fork's frontend at the example deployment's API.

The [VPS setup guide](backend/README.md#deploy-docker--nginx) covers initial DNS, credentials, ports and TLS. Set up [automatic GitHub deployment](backend/README.md#automatic-deploys-from-github) once to deploy the API after every push to `main` passes its checks. The workflow uses a restricted SSH key, waits for container health, checks public HTTPS health and records recent API logs.

For a manual update:

```bash
cd /opt/services-portfolio
git pull --ff-only origin main
bash backend/deploy/update.sh
```

Then validate a real assistant request. A healthy database does not establish that credits or API credentials are valid.

## Contributing

Issues and focused pull requests are welcome. Start a branch from current `main`, describe the problem and resulting behavior, and include the checks you ran. Reuse the existing components, tokens and backend services; add regression cases for changes to retrieval, notifications, generation or safety. Read [AGENTS.md](AGENTS.md) before using a coding agent in this repository.

Do not include credentials, private conversations or confidential role descriptions in issues, logs or test fixtures. For a sensitive security issue, use a private contact channel listed on the maintainer's GitHub profile rather than a public issue.

## Project layout

```text
app/                    Next.js pages, routes and theme
components/             portfolio, chat and shared UI components
lib/                    frontend API protocol and portfolio content
content/blog/           MDX articles
backend/                Go API, Docker setup, SQL schema and answer evals
knowledge-backend/       offline Python ingestion and knowledge evaluation
professional-knowledge/ bundled example Markdown knowledge base
```

## License

[MIT](LICENSE), copyright David Clinton. Third-party components and fonts retain their own licenses and notices; Prompt Kit attribution is in [components/prompt-kit/README.md](components/prompt-kit/README.md).
