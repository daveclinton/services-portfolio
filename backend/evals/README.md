# Answer checks

A small regression set for Ask AI: real visitor-style questions, including
capability questions ("Can he build X?"), questions the knowledge base can't
answer (education), and off-topic ones that should get a one-line redirect.

```bash
python3 evals/ask.py http://127.0.0.1:8080 evals/questions.txt
```

Each answer is printed with a flag: `SCOPE-REFUSAL` means the generic
"I can only answer…" fallback was used. Read the answers too: check that
nothing is invented and that "not covered" claims are actually true.

Run it only against a local API: every question is stored as a conversation,
and with `BREVO_API_KEY` set it would send alert emails.

Baseline (Nov 2026): the original prompt with top-8 retrieval refused 5 of
the first 15 questions. Whole-knowledge-base context, the new answer policy
and gpt-4.1-mini answer all 15 and redirect both off-topic questions.
