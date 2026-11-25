#!/usr/bin/env bash
# One-time setup, run as the existing VPS deployment user after pulling main.
set -euo pipefail
if [[ $# != 1 || "$1" == *$'\n'* || ! "$1" =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ .*)?$ ]]; then
  echo "usage: bash deploy/install-github-deploy.sh 'ssh-ed25519 AAAA... comment'" >&2
  exit 64
fi
key="$1"
repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
[[ "$(git -C "$repo_root" branch --show-current)" == main ]] || { echo "Switch this checkout to main first." >&2; exit 1; }
command -v flock >/dev/null
command -v curl >/dev/null
docker compose version >/dev/null
if ! docker info >/dev/null 2>&1; then
  sudo -n docker info >/dev/null 2>&1 || { echo "Enable non-interactive Docker access for this user first." >&2; exit 1; }
fi
[[ -f "$repo_root/backend/.env" ]] || { echo "Complete the initial backend setup first." >&2; exit 1; }

mkdir -p "$HOME/.local/bin" "$HOME/.local/share/services-portfolio" "$HOME/.ssh"
chmod 700 "$HOME/.ssh" "$HOME/.local/share/services-portfolio"
launcher="$HOME/.local/bin/services-portfolio-deploy"
install -m 700 "$repo_root/backend/deploy/github-ssh.sh" "$launcher"
printf '%s\n' "$repo_root" > "$HOME/.local/share/services-portfolio/repo-path"
chmod 600 "$HOME/.local/share/services-portfolio/repo-path"
touch "$HOME/.ssh/authorized_keys"
chmod 600 "$HOME/.ssh/authorized_keys"
entry="restrict,command=\"$launcher\" $key"
if ! grep -Fxq -- "$entry" "$HOME/.ssh/authorized_keys"; then
  printf '\n%s\n' "$entry" >> "$HOME/.ssh/authorized_keys"
fi
echo "Installed the restricted GitHub deployment key for $repo_root."
echo "Run the 'Deploy VPS API' workflow once, or push the next change to main."
