"""Shared fixtures for the knowledge app tests."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest

#: A small but complete knowledge base that mirrors the frontmatter contract.
FIXTURE_KB = Path(__file__).resolve().parent / "fixtures" / "kb"


@pytest.fixture
def fixture_kb() -> Path:
    """The read-only fixture knowledge base."""
    return FIXTURE_KB


@pytest.fixture
def kb_copy(tmp_path: Path) -> Path:
    """A throwaway copy of the fixture knowledge base that tests may edit."""
    destination = tmp_path / "kb"
    shutil.copytree(FIXTURE_KB, destination)
    return destination
