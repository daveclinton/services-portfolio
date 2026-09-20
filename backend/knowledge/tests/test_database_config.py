"""Unit tests for DATABASE_URL / POSTGRES_* handling in config.settings.

No database connection is made: these exercise the pure parsing helpers.
"""

from __future__ import annotations

import pytest

from config.settings import _database_config, _database_from_url


def test_parses_a_neon_style_url(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_SSLMODE", raising=False)

    config = _database_from_url(
        "postgresql://dave:secret%21@ep-cool-123.neon.tech:5432/neondb"
        "?sslmode=require"
    )

    assert config["ENGINE"] == "django.db.backends.postgresql"
    assert config["NAME"] == "neondb"
    assert config["USER"] == "dave"
    assert config["PASSWORD"] == "secret!"
    assert config["HOST"] == "ep-cool-123.neon.tech"
    assert config["PORT"] == "5432"
    assert config["OPTIONS"] == {"sslmode": "require"}


def test_pooled_url_keeps_channel_binding(monkeypatch):
    monkeypatch.delenv("POSTGRES_SSLMODE", raising=False)

    config = _database_from_url(
        "postgresql://dave:pw@ep-cool-123-pooler.neon.tech:6543/neondb"
        "?sslmode=require&channel_binding=require"
    )

    assert config["PORT"] == "6543"
    assert config["OPTIONS"] == {
        "sslmode": "require",
        "channel_binding": "require",
    }


def test_rejects_non_postgres_schemes():
    with pytest.raises(ValueError):
        _database_from_url("mysql://user:pw@localhost/db")


def test_database_url_wins_over_individual_vars(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://url-user:url-pw@url-host:5433/url-db"
    )
    monkeypatch.setenv("POSTGRES_DB", "ignored")
    monkeypatch.setenv("POSTGRES_HOST", "ignored")

    config = _database_config()

    assert (config["NAME"], config["USER"], config["HOST"]) == (
        "url-db",
        "url-user",
        "url-host",
    )


def test_falls_back_to_individual_vars(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("POSTGRES_SSLMODE", raising=False)
    monkeypatch.setenv("POSTGRES_DB", "mydb")
    monkeypatch.setenv("POSTGRES_HOST", "localhost")

    config = _database_config()

    assert config["NAME"] == "mydb"
    assert config["HOST"] == "localhost"
    assert config.get("OPTIONS", {}) == {}


def test_explicit_sslmode_env_overrides_url_param(monkeypatch):
    monkeypatch.setenv("POSTGRES_SSLMODE", "prefer")

    config = _database_from_url("postgresql://u:p@h/db?sslmode=require")

    assert config["OPTIONS"] == {"sslmode": "prefer"}
