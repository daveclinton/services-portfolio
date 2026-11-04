"""Protect migration compatibility while the HTTP application is removed."""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db
def test_existing_extension_migration_identity_is_preserved():
    executor = MigrationExecutor(connection)
    extension = ('api', '0001_enable_pgvector')
    chunks = ('knowledge', '0002_knowledgechunk')

    # An existing database must recognize the same migration record after the
    # package move, and fresh installs must create vector before using it.
    assert extension in executor.loader.applied_migrations
    plan = executor.loader.graph.forwards_plan(chunks)
    assert plan.index(extension) < plan.index(chunks)
    assert executor.migration_plan(executor.loader.graph.leaf_nodes()) == []
    with connection.cursor() as cursor:
        cursor.execute("SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm')")
        assert {row[0] for row in cursor.fetchall()} == {'vector', 'pg_trgm'}


def test_runserver_is_disabled():
    with pytest.raises(CommandError, match='command-line only'):
        call_command('runserver')
