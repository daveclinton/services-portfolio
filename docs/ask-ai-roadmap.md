# Ask AI roadmap

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

## 2. Knowledge coverage

The cheapest quality gain: the assistant can't answer about things that aren't
in the knowledge base (`../professional-knowledge`).

- [ ] **Opesi Mansion** and **9ntyplus**: featured on the homepage, no documents.
- [ ] **The 12 blog posts** in `content/blog/`: not indexed, so "What has David
      written about RAG?" fails. Ingest each post's title, date, URL and body
      as chunks with `source_type: blog-post`.
- [ ] **This platform**: the portfolio, Ask AI, and the Go backend on the VPS.
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

- [x] **Self-hosted embeddings in Postgres.** Text Embeddings Inference runs
      `nomic-ai/nomic-embed-text-v1.5` (768 dimensions) in the compose stack;
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
