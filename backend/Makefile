# Local:
#   make up             start Postgres (pgvector) + the API in Docker
#   make down           stop them (data stays in the pgdata volume)
#   make db-ingest      load the knowledge base with the knowledge-backend pipeline
#   make db-import SOURCE_URL=...   copy data from another Postgres (e.g. Neon)
#   make run            run the API with `go run` against the Docker database
#   make test
# VPS: see README.md (clone the repo, create .env, run ./deploy/setup.sh)
KNOWLEDGE_BACKEND ?= ../knowledge-backend

.PHONY: up down logs psql db-ingest db-import run test

up:
	docker compose up -d --build --wait
	@echo "API: http://127.0.0.1:$$(grep -E '^API_PORT=' .env | cut -d= -f2)/healthz"

down:
	docker compose down

logs:
	docker compose logs -f api

psql:
	docker compose exec db psql -U portfolio -d portfolio

# Runs the Python ingestion pipeline against the Docker database. DATABASE_URL
# in .env points at 127.0.0.1:$DB_PORT, so knowledge-backend picks it up.
db-ingest:
	set -a && . ./.env && set +a && cd $(KNOWLEDGE_BACKEND) && .venv/bin/python manage.py ingest_knowledge --strict

db-import:
	@test -n "$(SOURCE_URL)" || (echo "usage: make db-import SOURCE_URL='postgresql://...'" && exit 1)
	./deploy/import-db.sh '$(SOURCE_URL)'

run:
	docker compose up -d --wait db
	set -a && . ./.env && set +a && go run ./cmd/api

test:
	go vet ./...
	go test ./...
	python3 -m unittest discover -s evals -p 'test_*.py'
	python3 -m unittest discover -s deploy -p 'test_*.py'
