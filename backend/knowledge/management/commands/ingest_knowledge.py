"""``manage.py ingest_knowledge`` — ingest the Markdown knowledge base.

Examples::

    python manage.py ingest_knowledge
    python manage.py ingest_knowledge --kb-path ~/professional-knowledge
    python manage.py ingest_knowledge --dry-run
    python manage.py ingest_knowledge --only projects
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from knowledge.ingestion import SOURCE_TYPES, run_ingestion
from knowledge.ingestion.errors import KnowledgeIngestionError


class Command(BaseCommand):
    help = (
        "Read the Markdown knowledge base (professional-knowledge) and upsert "
        "Person, Company, Employment, Skill, Technology, Project, Evidence and "
        "KnowledgeChunk rows. Idempotent: re-running updates in place."
    )

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--kb-path",
            dest="kb_path",
            default=None,
            metavar="PATH",
            help=(
                "Root of the knowledge base. Falls back to the "
                "KNOWLEDGE_BASE_PATH environment variable, then to "
                "~/professional-knowledge."
            ),
        )
        parser.add_argument(
            "--dry-run",
            dest="dry_run",
            action="store_true",
            help=(
                "Parse and validate only. Reports what would be created or "
                "updated and writes nothing to the database."
            ),
        )
        parser.add_argument(
            "--only",
            dest="only",
            choices=list(SOURCE_TYPES),
            default=None,
            help=(
                "Ingest a single source type only: "
                f"{', '.join(SOURCE_TYPES)}."
            ),
        )

    def handle(self, *args, **options) -> None:
        try:
            report = run_ingestion(
                kb_path=options["kb_path"],
                dry_run=options["dry_run"],
                only=options["only"],
            )
        except KnowledgeIngestionError as exc:
            raise CommandError(str(exc))

        self.stdout.write(report.render())
