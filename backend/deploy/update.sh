#!/usr/bin/env bash
# Update only the existing API service; initial setup stays in setup.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "Run the initial VPS setup and create backend/.env first." >&2; exit 1; }
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then
  sudo -n docker info >/dev/null 2>&1 || { echo "Deployment needs non-interactive Docker access." >&2; exit 1; }
  DOCKER=(sudo -n docker)
fi

report() {
  local result=$?
  trap - EXIT
  "${DOCKER[@]}" compose logs --since 5m --tail 50 api || true
  if (( result != 0 )); then
    echo "API deployment failed. Check the logs above; this script does not roll back automatically." >&2
  fi
  exit "$result"
}
trap report EXIT

echo "Deploying API commit $(git rev-parse HEAD)"
"${DOCKER[@]}" compose up -d --build --no-deps --wait --wait-timeout 180 api
curl --fail --silent --show-error --connect-timeout 5 --max-time 20 \
  --retry 5 --retry-all-errors --retry-delay 2 https://api.daveclintonn.cc/healthz
echo
echo "API deployment is healthy."
