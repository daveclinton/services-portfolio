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
Disable `BREVO_API_KEY` in the local API environment before running the suite.

```bash
python3 evals/ask.py http://127.0.0.1:8080 evals/guardrails.json --json
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

Baseline (Nov 2026): the original prompt with top-8 retrieval refused 5 of
the first 15 questions. Whole-knowledge-base context, the new answer policy
and gpt-4.1-mini answer all 15 and redirect both off-topic questions.
