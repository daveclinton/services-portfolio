# Ask AI roadmap

## Shipped: project-scoping assistant

- [x] Six-question discovery covering problem, users, systems, data/access,
      constraints and success criteria, with Back, Enter-to-advance and review/edit.
- [x] Reviewed answers use the existing consent, chat streaming, retrieval,
      notifications, request limits and retention rather than a separate pipeline.
- [x] Proposed first-release brief separates future recommendations from verified
      experience and leaves scope, pricing, availability and dates for David's review.
- [x] Follow-up chat and same-tab conversation restoration preserve scoping mode.
- [x] Offline request/prompt/notification checks and live evaluation cases.

The form follows Typeform's question-by-question approach, including
[keyboard advance](https://help.typeform.com/hc/en-us/articles/4410017947412-Keyboard-shortcuts-and-text-formatting-in-Typeform)
and [progress](https://help.typeform.com/hc/en-us/articles/360051557892-Activate-the-Progress-bar),
using the portfolio's existing controls and theme. Discovery-to-contact follows
[Intercom Fin for Sales](https://www.intercom.com/help/en/articles/13927077-how-to-train-fin-for-sales).

Next additions are tracked as tasks in the feature PR: shareable evidence/brief
packs, booking, uploads, claim-level evidence, voice, knowledge-building and
optional returning-visitor memory. Existing answer feedback and blog ingestion
remain supporting quality work.

Step 1 (the chat redesign) is done. These are the remaining steps, in order.
Each one should be measurable against the evaluation set from step 3 before
moving on.

## ✅ 1. Chat redesign

Layout and interactions borrowed from open-source implementations: prompt-kit's
conversation blocks ([repo](https://github.com/ibelick/prompt-kit), MIT) and
assistant-ui's [ChatGPT](https://www.assistant-ui.com/examples/chatgpt),
[Claude](https://www.assistant-ui.com/examples/claude) and
[Grok](https://www.assistant-ui.com/examples/grok) examples, adapted to Base UI
and this site's tokens. The adapted components live in `components/prompt-kit/`.

- Flat bordered composer (input above a button row); the send button morphs
  into stop. No orb: a shimmering status line ("Gathering projects…") while
  the answer is prepared.
- Starter questions as a quiet list under the composer that fills the input
  for editing, per Nielsen Norman Group's
  [prompt-suggestion guidance](https://www.nngroup.com/articles/designing-use-case-prompt-suggestions/).
- No disclaimer text; "questions left today" only appears at 5 or fewer.

- The user's message sits in a soft bubble on the right; the answer is unboxed
  markdown in the reading column.
- Copy and "Ask again" under answers. The last answer always shows them; older
  ones show them on hover on desktop.
- The send button turns into a stop button while answering; Escape also stops.
- Pinned to the newest message while streaming (`use-stick-to-bottom`), with a
  scroll-to-latest button when the reader scrolls up.
- Starter questions on the empty screen (`askAi.suggestions` in
  `lib/portfolio-data.ts`).
- "New chat", and the conversation survives a reload in the same tab.
- Consent is a persistent checkbox under the composer until accepted, then a
  one-line storage notice with the questions left today.

## ✅ 1b. Answer quality

The assistant used to reply "try Google" to questions it could answer: the
prompt told it to return a scope message whenever the top 8 retrieved chunks
didn't fully support an answer, and contact details weren't in the knowledge
base. Changes, measured with `backend/evals/` (5 of 15 refused before, 0 after):

- **Whole knowledge base in every prompt** (~34k tokens). Anthropic's
  [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
  recommends this below ~200k tokens. The text is identical across requests
  and comes first, so OpenAI's automatic prompt caching serves ~99% of it
  (logged as `cached_tokens`). Retrieval still ranks likely-relevant parts.
- **Answer policy** following Anthropic's
  [Reduce hallucinations](https://platform.claude.com/docs/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
  guidance: answer what the material supports, say specifically what isn't
  covered, never send visitors elsewhere, one-line redirect for off-topic
  questions, contact details for hiring questions.
- **Site facts** (`backend/internal/askai/site_facts.md`): contact details,
  links, roles, and a description of this system itself as evidence of David's
  work. Keep it in sync with `lib/portfolio-data.ts`.
- **gpt-4.1-mini** writes answers (better long-context instruction following
  than gpt-4o-mini in the same checks); gpt-4o-mini still plans retrieval.

## 2. Knowledge coverage

The cheapest quality gain: the assistant can't answer about things that aren't
in the knowledge base (`professional-knowledge/`).

- [x] **Opesi Mansion** and **9ntyplus**: mentioned in the site facts as early
      work in progress (no detailed documents yet, by choice).
- [ ] **The 12 blog posts** in `content/blog/`: not indexed, so "What has David
      written about RAG?" fails. Ingest each post's title, date, URL and body
      as chunks with `source_type: blog-post`.
- [x] **This platform**: described in the site facts. A full knowledge-base
      project write-up would let it answer deeper questions.
- [ ] Confirm whether the VPS apps `studio` and `warranty-registration` are
      covered (aqua-prana and the Mika warranty app already are).

After ingesting: `make db-ingest` locally, and on the VPS run the pipeline over
an SSH tunnel (see `backend/README.md`).

## 3. Evaluation set and feedback

Without this we can't tell whether later changes help.

- [ ] 30–50 real questions, each with the source paths a good answer needs.
      Score retrieval recall@k and answer faithfulness; run it before and after
      every retrieval change. Seed it from the 30-day conversation log.
- [ ] Thumbs up/down under answers. Needs a `POST /ask-ai/feedback` endpoint and
      a `rating` column on `knowledge_aiconversationturn` (a new Django
      migration, then regenerate `backend/db/init/001_schema.sql`). Down-voted
      turns become evaluation cases.

## 4. Retrieval quality

- [x] **Embeddings in our own Postgres.** OpenAI `text-embedding-3-small`
      (1536 dimensions) by default, stored and searched in pgvector
      (`askai_chunk_embedding`), re-embedded when content changes. Indexing the
      whole knowledge base takes ~7 seconds and well under a cent.
- [x] **Self-hosted embeddings option.** Text Embeddings Inference runs
      `BAAI/bge-small-en-v1.5` (384 dimensions) as an optional, memory-capped
      service in the compose stack (built and tested, **switched off for now**
      until the VPS has ~500 MB of spare RAM);
      the API stores vectors in `askai_chunk_embedding` and re-embeds new or
      changed chunks every 5 minutes. No OpenAI embeddings or vector store.
- [ ] **Self-hosted answers (optional).** OpenAI still writes answers and plans
      retrieval. Replacing it means running an LLM on the VPS (slow on CPU) or
      another provider.
- [ ] **Contextual chunks.** Before embedding and full-text indexing, prepend a
      one-line summary of the parent document to each chunk. Anthropic's
      Contextual Retrieval research reported top-20 retrieval failures falling
      35% with contextual embeddings and 49% with contextual BM25 added
      (secondary summaries:
      [CO/AI](https://getcoai.com/news/anthropic-introduces-contextual-retrieval-to-boost-accuracy-of-rag-systems)).
- [ ] **Reranking.** Retrieve 20–50 candidates with the existing hybrid search
      and rerank to the top 5–8 with a cross-encoder or a small model. The same
      research reported a 67% reduction with reranking on top
      ([Supermemory](https://supermemory.ai/blog/contextual-reranking-for-rag/)).
      With ~100 chunks this is cheap.

Sources agree on this order: hybrid search, then reranking, measured at each
step, with agentic retrieval only where evaluation shows a gap
([agileinfoways](https://www.agileinfoways.com/blog/building-production-ready-rag-systems-2026),
[aitraining2u](https://www.aitraining2u.com/blog/production-rag-patterns-2026.html),
[dev.to](https://dev.to/_6638a39c349d7e9c85ee20/rag-best-practices-2026-building-production-ready-retrieval-systems-43jn)).
These are mostly vendor blogs; treat their numbers as directional.

## Research: what to improve next, given the current design

Since every answer now gets the whole knowledge base (~34k tokens), retrieval
no longer decides what the model can see. Its jobs are to point the model at
the most relevant parts and to provide traceable sources. Sources agree this
hybrid (full context for a small, stable core, retrieval on top) is the
sensible default below ~200k tokens, and that retrieval matters more as the
corpus grows or citations become important
([Towards AI](https://pub.towardsai.net/rag-vs-long-context-in-2026-when-retrieval-still-wins-e6ebad9a4096),
[alexcloudstar](https://alexcloudstar.com/blog/rag-vs-long-context-2026/),
[Anthropic](https://www.anthropic.com/news/contextual-retrieval)). In order:

1. **Fill the knowledge gaps.** The biggest quality limit is now missing
   facts, not retrieval: education, team leadership, the blog posts, and
   details on Opesi Mansion and 9ntyplus when they're ready. The assistant
   says "I don't have details on…" for these.
2. **Source chips.** Use the ranked results (already sent as the `citations`
   event) to show "Based on: Mika · Aqua Prana" links under answers. This is
   where retrieval now adds the most visible value.
3. **Contextual chunk headers.** Before embedding, prepend each chunk's
   document title, type and project/company, so a chunk like "Built a
   Rust/Axum API…" is searchable as Aqua Prana work. This is the cheap form of
   Anthropic's contextual retrieval (35% fewer retrieval failures for
   contextual embeddings in their tests).
4. **A bigger evaluation set and a judge.** Grow `backend/evals/` from real
   (consented) questions, and add an automatic check that every claim in an
   answer is supported by the material. Thumbs up/down feed it.
5. **Watch the cache.** The log's `cached_tokens` shows ~99% of the prompt is
   cached. Re-ingesting the knowledge base changes the prefix and costs one
   full-price request; nothing to do unless updates become very frequent.
6. **When the knowledge base outgrows the prompt** (roughly 150–200k tokens),
   switch from "send everything" to "send the top retrieved documents". The
   retrieval pipeline is already there, so it's a change in
   `buildMessages`, not a rebuild.

Not worth it at this size: shortening embeddings to 512 dimensions (89 rows),
a reranking model (the model already reads everything), or self-hosting
embeddings on the current 4 GB VPS.

## 5. Features

- [ ] **Structured answers from tables.** "List every project with dates" is
      better answered from `knowledge_project` / `knowledge_employment` than
      from text chunks: give the model a tool that queries them.
- [ ] **Source chips** under answers. The server already sends a `citations`
      event that the UI ignores; map knowledge paths to this site's pages
      (`/experience`, blog posts) so chips link somewhere useful, not to raw
      file paths.
- [ ] **Follow-up suggestions** after each answer (prompt-kit `PromptSuggestion`
      is already in place).
- [ ] **Contact card** when the intent is `rates` or a hiring question:
      "Email David" / "Book a call".
- [ ] **Rich cards** for projects and roles inside answers.
- [ ] **Shareable conversation links.**
