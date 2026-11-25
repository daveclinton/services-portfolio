# Answer checks

A small regression set for Ask AI: real visitor-style questions, including
capability questions ("Can he build X?"), questions the knowledge base can't
answer (education), and off-topic ones that should get a one-line redirect.

```bash
python3 evals/ask.py http://127.0.0.1:8080 evals/questions.txt
```

The harness exits nonzero for provider/stream errors, empty answers, or failed
case assertions. It records first-token and total latency, and `--json` emits
machine-readable results. Read the answers too: automated checks do not prove
that all claims are grounded or that all prompt attacks are prevented.

Only loopback URLs are accepted: every question is stored as a conversation.
Disable `SENDY_API_KEY` in the local API environment before running the suite.

```bash
python3 evals/ask.py http://127.0.0.1:8080 evals/guardrails.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/hiring.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/project-scoping.json --json
python3 evals/ask.py http://127.0.0.1:8080 evals/interactive.json --json
make test # offline prompt-boundary, request-validation and provider-stream tests
# Optional real Postgres check, in an isolated schema of a test database:
ASKAI_TEST_DATABASE_URL='postgresql://...test-db...' go test ./internal/askai -run TestConversationRetentionWithForeignKeys -v
```

The production request harness keeps application policy separate from JSON
reference data and model-derived retrieval hints, bounds planning to four
seconds, and distinguishes successful, truncated, refused and broken streams.
Cleanup locks expired parent rows and removes their turns before deleting them.
Provider logs include the turn ID and first-token latency for diagnosis.
The existing structured classifier also identifies policy-override attempts;
flagged requests receive a scoped reply before retrieval or answer generation.
Literal privileged role prefixes are rejected by the application even when
the classifier is unavailable. Legitimate questions about guardrails stay allowed.

These changes borrow the explicit boundary and repeatable-check approach from
[OpenAI's harness engineering article](https://openai.com/index/harness-engineering/),
[Meta's Prompt Guard guidance](https://dev.meta.ai/llama/docs/model-cards-and-prompt-formats/prompt-guard),
and [Anthropic's eval guidance](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
No separate guard model or new runtime dependency is installed. These are
application-specific defenses, not a complete prompt-injection detector.

The project-scoping cases cover a grounded warehouse proposal, missing-problem
clarification, budget/deadline requests that must not become commitments, and
follow-up refinements. They require a configured local generation service; offline
tests separately cover workflow acceptance, prompt boundaries, notification policy,
and discovery request limits. Review generated briefs as well as case assertions.

Interactive cases opt in with `interactive: true` and can assert `expected_view`
and `min_view_items`; the harness also rejects unknown evidence references. Cases
cover project cards, architecture, role comparisons, dated timelines, editable
briefs and visitor edits that must not become commercial commitments. A diagram
is permitted only with supporting connections; the architecture case allows a
plain answer when its retrieved material cannot support a diagram.

The AI-systems regression uses the exact question from the reported live screen.
`max_answer_words`, `max_project_preview_words`, `require_item_evidence`, and
`view_must_include` check the short chat summary separately from the detailed
result. `check_follow_up_quality` requires two distinct editable prompts with
short labels and rejects simple verb-plus-item repetitions. These are structural
checks; human review must still assess factual support and whether suggestions
meaningfully advance the conversation. A word budget is generation guidance and
an evaluation assertion, not runtime truncation of a streamed answer.
Follow-up label length is also bounded by the structured-output schema and the
server validator; complete labels are generated within the limit instead of
being cut into partial phrases. Prompt perspective and explicit unsupported
comparison gaps have separate regression checks.
The server replaces detected repeated item choices and visitor-directed data
requests with the same editable refinement questions used by the chat fallback.
This catches the observed regression without another model call; it does not
classify the meaning of every possible suggestion.

The November 2026 usability revision passed all seven interactive cases locally
with gpt-4.1-mini, lexical retrieval and email alerts disabled. Summaries ranged
from 39 to 69 words in that run. This is a sampled regression result, not a
guarantee for every future generation or production retrieval result.

Offline frontend tests exercise the SSE contract, context budgets, saved edits,
malformed views and URL handling. Real React components are rendered in Node for
all five interactive views and grouped starters, using the existing TypeScript
dependency to load TSX. No DOM, browser engine or screenshot tool is used.

Baseline (Nov 2026): the original prompt with top-8 retrieval refused 5 of
the first 15 questions. Whole-knowledge-base context, the new answer policy
and gpt-4.1-mini answer all 15 and redirect both off-topic questions.
