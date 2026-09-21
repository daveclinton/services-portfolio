"""Prevent the offline pipeline from being started as an HTTP server."""

from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'HTTP serving lives in Next.js; this backend only runs offline commands.'
    requires_system_checks = []

    def handle(self, *args, **options):
        raise CommandError(
            'This backend is command-line only. Run `pnpm dev` from the '
            'repository root to serve the frontend and its API routes.'
        )
