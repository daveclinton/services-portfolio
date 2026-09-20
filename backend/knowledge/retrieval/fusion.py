"""Reciprocal rank fusion (RRF).

RRF combines several ranked lists without needing their scores to be
comparable — which matters here because a Postgres ``ts_rank`` and a cosine
distance live on completely different scales.

    score(d) = sum over rankings r of 1 / (k + rank_r(d))

``k = 60`` is the value from the original Cormack et al. paper and the
default used by most search stacks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Hashable, Iterable

DEFAULT_K = 60


@dataclass
class FusedHit:
    """One document plus the rankings that produced it."""

    key: Hashable
    score: float = 0.0
    ranks: dict[str, int] = field(default_factory=dict)

    @property
    def matched_by(self) -> tuple[str, ...]:
        return tuple(sorted(self.ranks))


def reciprocal_rank_fusion(
    rankings: dict[str, Iterable[Hashable]],
    *,
    k: int = DEFAULT_K,
) -> list[FusedHit]:
    """Fuse ``{strategy_name: ordered_keys}`` into one ranked list."""
    fused: dict[Hashable, FusedHit] = {}
    for strategy, keys in rankings.items():
        for rank, key in enumerate(keys, start=1):
            hit = fused.setdefault(key, FusedHit(key=key))
            hit.score += 1.0 / (k + rank)
            hit.ranks[strategy] = rank
    return sorted(fused.values(), key=lambda hit: (-hit.score, str(hit.key)))
