"""Errors raised while ingesting the Markdown knowledge base.

Every problem carries the path of the offending file *relative to the
knowledge base root* so the message can be acted on without guessing which
file failed.  Multiple problems are collected into a single exception so a
broken knowledge base can be fixed in one pass instead of one file at a time.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass(frozen=True)
class Problem:
    """A single, actionable ingestion problem."""

    source_path: str
    message: str
    details: tuple[str, ...] = field(default_factory=tuple)

    def render(self) -> str:
        lines = [f"{self.source_path}: {self.message}"]
        lines.extend(f"    - {detail}" for detail in self.details)
        return "\n".join(lines)


class KnowledgeIngestionError(Exception):
    """Raised when the knowledge base cannot be ingested."""

    def __init__(self, problems: Iterable[Problem], kb_path: str | None = None):
        self.problems: list[Problem] = list(problems)
        self.kb_path = kb_path
        super().__init__(self.render())

    @classmethod
    def single(
        cls,
        source_path: str,
        message: str,
        details: Iterable[str] = (),
        kb_path: str | None = None,
    ) -> "KnowledgeIngestionError":
        """Build an error with exactly one problem."""
        return cls([Problem(source_path, message, tuple(details))], kb_path=kb_path)

    def render(self) -> str:
        header = "Knowledge ingestion failed"
        if self.kb_path:
            header = f"{header} (kb_path={self.kb_path})"
        body = "\n".join(problem.render() for problem in self.problems)
        return f"{header}:\n{body}"
