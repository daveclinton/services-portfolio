"""Django ORM and management-command settings for the offline data pipeline.

Client requests are served by Next.js. This project has no HTTP entrypoint,
URL configuration, admin, sessions, or web middleware.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

INSTALLED_APPS = [
    'django.contrib.postgres',
    'database.apps.DatabaseConfig',
    'knowledge',
]


def _database_from_url(url: str) -> dict:
    """Parse a ``postgres://`` URL with the standard library (no new deps)."""
    from urllib.parse import parse_qs, unquote, urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("postgres", "postgresql"):
        raise ValueError(f"unsupported DATABASE_URL scheme: {parsed.scheme!r}")
    query = parse_qs(parsed.query)
    options = {
        key: values[0]
        for key in ("sslmode", "channel_binding")
        for values in [query.get(key, [])]
        if values
    }
    if os.environ.get("POSTGRES_SSLMODE"):
        options["sslmode"] = os.environ["POSTGRES_SSLMODE"]
    config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': unquote(parsed.path.lstrip("/")),
        'USER': unquote(parsed.username or ""),
        'PASSWORD': unquote(parsed.password or ""),
        'HOST': parsed.hostname or "",
        'PORT': str(parsed.port) if parsed.port else "",
    }
    if options:
        config['OPTIONS'] = options
    return config


def _database_config() -> dict:
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return _database_from_url(url)
    sslmode = os.environ.get("POSTGRES_SSLMODE")
    return {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('POSTGRES_DB', 'postgres'),
        'USER': os.environ.get('POSTGRES_USER', 'postgres'),
        'PASSWORD': os.environ.get('POSTGRES_PASSWORD', 'postgres'),
        'HOST': os.environ.get('POSTGRES_HOST', 'localhost'),
        'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        **({'OPTIONS': {'sslmode': sslmode}} if sslmode else {}),
    }


DATABASES = {'default': _database_config()}

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# --kb-path takes precedence over this setting in ingest_knowledge.
KNOWLEDGE_BASE_PATH = Path(
    os.environ.get('KNOWLEDGE_BASE_PATH', Path.home() / 'professional-knowledge')
).expanduser()

# Used by embedding generation and offline semantic retrieval evaluation.
OPENAI_EMBEDDING_MODEL = os.environ.get(
    'OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'
)
