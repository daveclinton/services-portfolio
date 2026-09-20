# Fly.io image for the Django backend.
#
# Build context is this directory, so `backend/.venv`, `.env` and the test cache
# are excluded by .dockerignore. The Markdown knowledge base is a separate repo
# and is deliberately NOT baked in — ingest into the deployed database instead
# (see "Deploying" in the root README).

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000

WORKDIR /app

# psycopg[binary] and the rest ship wheels, so no build toolchain is needed.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# WhiteNoise reads the collected files at runtime. Settings only need *a* secret
# to import here; the real one is injected at runtime via `fly secrets set`, and
# `DEBUG` is unset so this collects against the production storage backend.
RUN SECRET_KEY=build-time-only-collectstatic \
    python manage.py collectstatic --noinput

RUN useradd --create-home --uid 1000 app \
    && chown -R app:app /app
USER app

EXPOSE 8000

# Threads matter here: a grounded answer holds its worker for the length of the
# OpenAI stream, so --timeout is generous and gthread keeps other requests alive.
#
# Bind IPv6-any, not 0.0.0.0: Fly's proxy and its health checks reach a machine
# over its 6PN IPv6 address, and an IPv4-only socket answers them with
# "connection refused". On Linux `::` also accepts IPv4 (v4-mapped), so one
# socket still covers both families.
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "[::]:8000", \
     "--workers", "2", \
     "--threads", "4", \
     "--worker-class", "gthread", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
