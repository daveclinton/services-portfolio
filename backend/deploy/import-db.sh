#!/usr/bin/env bash
# Copy the data from an existing Postgres (e.g. the old Neon database) into the
# compose db container. Works locally and on the VPS:
#
#   ./deploy/import-db.sh 'postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require'
#
# It replaces the data in every table this database has (except
# django_migrations) in one transaction: if anything fails, nothing changes.
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE_URL="${1:-}"
if [[ -z "$SOURCE_URL" ]]; then
	echo "usage: $0 <source-database-url>" >&2
	exit 1
fi

DOCKER=(docker)
docker info >/dev/null 2>&1 || DOCKER=(sudo docker)
COMPOSE=("${DOCKER[@]}" compose)

"${COMPOSE[@]}" up -d --wait db

# Only copy tables this database has. The source may contain extras (e.g.
# Django's auth_* and admin tables) that the API doesn't use.
TABLES="$("${COMPOSE[@]}" exec -T db psql -U portfolio -d portfolio -Atc "
	SELECT format('%I.%I', schemaname, tablename) FROM pg_tables
	 WHERE schemaname = 'public' AND tablename <> 'django_migrations' ORDER BY 1")"
TABLE_ARGS=()
while read -r table; do
	[[ -n "$table" ]] && TABLE_ARGS+=("--table=$table")
done <<<"$TABLES"
echo "Tables to copy: $(tr '\n' ' ' <<<"$TABLES")"

echo "==> Dumping data from the source database"
# pg_dump runs inside the db container, so nothing needs installing on the host.
DUMP="$("${COMPOSE[@]}" exec -T db mktemp)"
trap '"${COMPOSE[@]}" exec -T db rm -f "$DUMP" >/dev/null 2>&1 || true' EXIT
"${COMPOSE[@]}" exec -T -e SOURCE_URL="$SOURCE_URL" -e DUMP="$DUMP" db sh -c \
	'pg_dump "$SOURCE_URL" --data-only --no-owner --no-privileges --disable-triggers "$@" > "$DUMP"' \
	sh "${TABLE_ARGS[@]}"

echo "==> Replacing the data in the local database"
TRUNCATE_SQL="$("${COMPOSE[@]}" exec -T db psql -U portfolio -d portfolio -Atc "
	SELECT 'TRUNCATE ' || string_agg(format('%I.%I', schemaname, tablename), ', ') || ' RESTART IDENTITY CASCADE;'
	  FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'django_migrations'")"
{
	echo "BEGIN;"
	echo "$TRUNCATE_SQL"
	"${COMPOSE[@]}" exec -T db cat "$DUMP"
	echo "COMMIT;"
} | "${COMPOSE[@]}" exec -T db psql -U portfolio -d portfolio -v ON_ERROR_STOP=1 -q

echo "==> Row counts"
"${COMPOSE[@]}" exec -T db psql -U portfolio -d portfolio -c "
	SELECT 'knowledge chunks' AS table, COUNT(*) FROM knowledge_knowledgechunk
	UNION ALL SELECT 'evidence', COUNT(*) FROM knowledge_evidence
	UNION ALL SELECT 'conversations', COUNT(*) FROM knowledge_aiconversation"
