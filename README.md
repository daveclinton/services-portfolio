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
- **Follow along by email:** one email field on Writing, article footers and `/subscribe`, with a quiet homepage invitation. A confirmation email completes signup; subscriber lists and unsubscribe handling live in Brevo, separately from chat consent. RSS remains available.
- **Reading-aware streaming:** follow a new answer, pause to read or select earlier text, and jump back to the latest response. The mobile composer follows the visible viewport above the keyboard.
- **Evidence-only fallback:** when generation is unconfigured or the provider reports billing, credential or availability problems, show clearly labelled excerpts instead of pretending to generate an assessment.
- **Useful owner notifications:** optional email for successful hiring/pricing/contact interest, critical provider incidents and a warning near the application request budget. Greetings and ordinary browsing do not email by default.
- **Operational controls:** per-visitor/IP/site limits, bounded conversation context, cancellation, recovery cooldowns, structured logs and local regression evaluations.
- **Portfolio publishing:** MDX articles, RSS, metadata, light/dark themes and shared design tokens.
- **Glass navigation and reading tools:** frosted controls use the existing light/dark palette, with a spring navigation highlight, one-time section entrances and a reading-progress dock with a back-to-top link. Higher contrast and reduced-transparency preferences restore solid controls; reduced motion removes movement and progress smoothing.

## Interface references

The current discovery flow follows the two Grok desktop screenshots supplied for the November 2026 redesign: composer first, a few category rows, then the selected category's suggestions. [NN/g's progressive-disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports revealing specialized choices only when requested. Results follow Grok's [title-and-open result cards](https://docs.x.ai/grok-bot/files-and-results), with item disclosure informed by the [GOV.UK accordion](https://design-system.service.gov.uk/components/accordion/) and [details](https://design-system.service.gov.uk/components/details/) guidance. Essential findings and caveats stay visible in chat. The app retains its own components, icons and tokens; references inform behavior rather than branding.

The follow-up revision uses [Google's concise conversation language](https://developers.google.com/assistant/conversation-design/language) and [nonduplicating suggestion guidance](https://developers.google.com/assistant/conversation-design/chips), [GOV.UK's input-label guidance](https://design-system.service.gov.uk/components/text-input/), and [Microsoft HAX correction guidance](https://www.microsoft.com/en-us/haxtoolkit/guideline/support-efficient-correction/). The existing Sources view maps canonical retrieved passages to result items; it does not independently verify every generated claim.

The glass controls follow [Glassy UI's dock-and-surface approach](https://github.com/alexburlis/glassyui), adapted to this app's components and tokens without adding a package. [Apple's material guidance](https://developer.apple.com/design/human-interface-guidelines/materials) informs the separation between glass controls and readable, solid content. Browser-specific SVG refraction is intentionally omitted; browsers without backdrop-filter support keep solid surfaces.

Three interactions use the existing Motion dependency: [shared layout highlights](https://motion.dev/docs/react-layout-animations) for pointer and keyboard navigation, [one-time scroll entrances](https://motion.dev/docs/react-scroll-animations) for homepage sections, and [scroll progress](https://motion.dev/docs/react-use-scroll) with [spring smoothing](https://motion.dev/docs/react-use-spring) for blog reading. Motion preferences are respected, static content remains visible without JavaScript, and native links retain keyboard behavior. The progress indicator is a JavaScript enhancement.

## Architecture

```text
Next.js frontend (React, Tailwind, shadcn/Base UI, Prompt Kit)
    │ POST /ask-ai/chat — Server-Sent Events
    ▼
Go API ── PostgreSQL + pgvector
    ├── OpenAI: retrieval planning, streamed answers, optional embeddings
    ├── optional self-hosted embeddings
    └── optional Brevo: qualified visitor and operational notifications

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
- Brevo credentials only if you want email notifications.

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

Email is optional. Configure `BREVO_API_KEY`, `BREVO_ALERT_TO_EMAIL` and `BREVO_SENDER_EMAIL` in the backend environment.

Visitor notifications are short notes containing the question and an answer preview,
without device details, confidence scores, IDs or the full generated result.
Confirmation emails and alerts share a minimal adaptation of [Postmark's Plain
templates](https://github.com/ActiveCampaign/postmark-templates), using the
portfolio's default blue/white palette and serif reading fallback. The MIT notice
is retained with the template and in the API image.

The personal invitation follows [Cassidy Williams' newsletter](https://cassidoo.co/newsletter/):
explain what readers receive, offer something to read, and keep RSS available.
The form follows [Typeform's one-question sequence](https://help.typeform.com/hc/en-us/articles/360053660271-My-first-form):
enter an email, review it, then request confirmation, with progress and a Back button.

With a Brevo API key and sender configured, newsletter setup runs in the background:
it reuses or creates the `daveclintonn.cc portfolio` folder, `daveclintonn.cc — Follow
along` list and `daveclintonn.cc — Confirm email` template. This does not enroll
anyone or send email. It only updates the application-owned template. Contacts
join through [Brevo's double opt-in API](https://developers.brevo.com/reference/create-doi-contact).
Set `NEWSLETTER_ENABLED=false` to disable signup, or `SITE_URL` to change the public
site origin. The API key needs contacts/lists and templates permissions. If setup
or delivery fails, signup reports unavailable rather than pretending to succeed.

Write and send future notes through Brevo's Campaigns interface to the confirmed
list, including its unsubscribe link. Signup currently accepts up to five attempts
per network per hour and 100 per API process per day, with a 15-minute cooldown
per email. These controls reuse the existing in-memory limiter and assume one API
instance; network and email rate-limit keys are hashed and temporary.

| Setting | Behavior |
| --- | --- |
| `BREVO_CONVERSATION_ALERTS=important` (default) | One email per conversation after a successful hiring, pricing or contact-interest turn; the first greeting does not consume that alert. |
| `BREVO_CONVERSATION_ALERTS=all` | One email after a successful conversation turn, including ordinary browsing. |
| `BREVO_CONVERSATION_ALERTS=off` | No visitor-conversation emails. |
| `BREVO_OPERATIONAL_ALERTS=true` (default) | Credential/billing incident alerts and an application daily request-budget warning at about 80% usage. |

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
