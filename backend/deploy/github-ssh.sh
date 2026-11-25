#!/usr/bin/env bash
# Installed as an SSH forced command. Only deploy a current main commit.
set -euo pipefail
if [[ ! "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  echo "Only 'deploy <40-character commit SHA>' is accepted." >&2
  exit 64
fi
requested="${BASH_REMATCH[1]}"
state_dir="$HOME/.local/share/services-portfolio"
IFS= read -r repo_root < "$state_dir/repo-path"

# Also serialize SSH retries and manual workflow runs on the server itself.
exec 9>"$state_dir/deploy.lock"
flock -w 900 9
cd "$repo_root"
[[ "$(git branch --show-current)" == main ]] || { echo "The VPS checkout must be on main." >&2; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "The VPS has tracked changes; resolve them before deploying." >&2; exit 1; }
export GIT_TERMINAL_PROMPT=0
git fetch origin main
if [[ "$(git rev-parse origin/main)" != "$requested" ]]; then
  echo "Skipping superseded commit $requested; a newer main deployment will handle it."
  exit 0
fi
git merge --ff-only origin/main
[[ "$(git rev-parse HEAD)" == "$requested" ]] || { echo "The VPS checkout does not match main; refusing deployment." >&2; exit 1; }
bash backend/deploy/update.sh
