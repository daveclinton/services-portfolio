"""Bookkeeping for an ingestion run: per-model action counts and warnings."""

from __future__ import annotations

from dataclasses import dataclass, field

#: When the same row is touched by several files we keep the strongest action:
#: a row created by ``overview.md`` and then patched by ``architecture.md`` is
#: still reported as *created* (once), not as created + updated.
ACTION_RANK = {"skipped": 1, "updated": 2, "created": 3}

#: Stable order for the summary table.
MODEL_ORDER = (
    "Person",
    "Company",
    "Employment",
    "Skill",
    "Technology",
    "Project",
    "Evidence",
    "KnowledgeChunk",
)

ACTIONS = ("created", "updated", "skipped")


@dataclass
class Recorder:
    """Collects what the upserters did (or, in a dry run, would do)."""

    actions: dict[tuple[str, str], str] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    files: list[str] = field(default_factory=list)

    def record(self, model: str, key: str, action: str) -> None:
        if action not in ACTION_RANK:  # pragma: no cover - guard against typos
            raise ValueError(f"unknown action {action!r}")
        current = self.actions.get((model, key))
        if current is None or ACTION_RANK[action] > ACTION_RANK[current]:
            self.actions[(model, key)] = action

    def warn(self, message: str) -> None:
        if message not in self.warnings:
            self.warnings.append(message)

    def counts(self) -> dict[str, dict[str, int]]:
        counts: dict[str, dict[str, int]] = {}
        for (model, _key), action in self.actions.items():
            bucket = counts.setdefault(model, {a: 0 for a in ACTIONS})
            bucket[action] += 1
        for model in MODEL_ORDER:
            counts.setdefault(model, {a: 0 for a in ACTIONS})
        return counts


@dataclass
class IngestionReport:
    """The result of :func:`knowledge.ingestion.run_ingestion`."""

    kb_path: str
    dry_run: bool
    only: str | None
    counts: dict[str, dict[str, int]]
    warnings: list[str] = field(default_factory=list)
    files: list[str] = field(default_factory=list)

    def total(self, action: str) -> int:
        return sum(self.counts.get(model, {}).get(action, 0) for model in MODEL_ORDER)

    def created(self) -> int:
        return self.total("created")

    def updated(self) -> int:
        return self.total("updated")

    def skipped(self) -> int:
        return self.total("skipped")

    def render(self) -> str:
        mode = "DRY RUN (no database writes)" if self.dry_run else "write run"
        scope = self.only or "all source types"
        lines = [
            f"Knowledge ingestion — {mode} — scope: {scope}",
            f"kb_path: {self.kb_path}",
            f"documents parsed: {len(self.files)}",
            "",
        ]

        header = f"{'model':<16}{'created':>9}{'updated':>9}{'skipped':>9}"
        lines.append(header)
        lines.append("-" * len(header))
        for model in MODEL_ORDER:
            bucket = self.counts.get(model, {a: 0 for a in ACTIONS})
            lines.append(
                f"{model:<16}{bucket.get('created', 0):>9}"
                f"{bucket.get('updated', 0):>9}{bucket.get('skipped', 0):>9}"
            )
        lines.append("-" * len(header))
        lines.append(
            f"{'total':<16}{self.created():>9}{self.updated():>9}{self.skipped():>9}"
        )

        lines.append("")
        if self.warnings:
            lines.append(f"warnings ({len(self.warnings)}):")
            lines.extend(f"  - {warning}" for warning in self.warnings)
        else:
            lines.append("warnings: none")

        if self.dry_run:
            lines.append("")
            lines.append("dry run: nothing was written to the database")

        return "\n".join(lines)
