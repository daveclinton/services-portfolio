"""Tokenization shared by the retrieval strategies.

Kept deliberately small and dependency-free: the goal is a stable set of
search terms, not linguistically perfect parsing. Postgres does the actual
stemming in :mod:`knowledge.retrieval.structured`.
"""

from __future__ import annotations

import re

#: Matches technology-shaped tokens: ``react``, ``next.js``, ``c++``, ``c#``,
#: ``node-js``, ``postgresql``.
_TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#._-]*")

#: Cheap stopword list. Kept short on purpose: every removed word is a word
#: that can no longer match a chunk, and knowledge-base prose is terse.
STOPWORDS = frozenset(
    {
        "a", "about", "an", "and", "any", "are", "as", "at", "be", "been",
        "but", "by", "can", "did", "do", "does", "for", "from", "get", "had",
        "has", "have", "he", "her", "his", "how", "i", "in", "into", "is",
        "it", "its", "me", "my", "of", "on", "or", "our", "she", "so",
        "that", "the", "their", "them", "then", "there", "these", "they",
        "this", "to", "up", "us", "was", "we", "were", "what", "when",
        "where", "which", "who", "why", "will", "with", "you", "your",
    }
)


def tokenize(text: str) -> list[str]:
    """Return unique lowercase search terms, in first-seen order."""
    terms: list[str] = []
    seen: set[str] = set()
    for raw in _TOKEN_RE.findall((text or "").lower()):
        term = raw.strip("._-")
        if len(term) < 2 or term in STOPWORDS or term in seen:
            continue
        seen.add(term)
        terms.append(term)
    return terms


def looks_like_a_question(text: str) -> bool:
    """True when the text is prose rather than a bare keyword query.

    Used only to decide whether an empty result set is worth explaining to
    the caller; it never changes the ranking.
    """
    stripped = (text or "").strip()
    if stripped.endswith("?"):
        return True
    return len(tokenize(stripped)) >= 4
