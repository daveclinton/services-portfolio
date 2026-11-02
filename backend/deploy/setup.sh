#!/usr/bin/env bash
# Run on the VPS from /opt/portfolio-api:  ./deploy/setup.sh
#
# 1. Picks a host port no other process or container is using (or keeps the
#    one from the last run).
# 2. Builds and starts the API container on 127.0.0.1:<port>.
# 3. Writes the nginx site for $DOMAIN, gets a Let's Encrypt certificate and
#    reloads nginx.
#
# Safe to re-run on every deploy.
set -euo pipefail

DOMAIN="${DOMAIN:-api.daveclintonn.cc}"
CONTAINER="portfolio-api"
PORT_START="${PORT_START:-8080}"
PORT_END="${PORT_END:-8999}"
SITE="/etc/nginx/sites-available/$DOMAIN"
CERT_DIR="/etc/letsencrypt/live/$DOMAIN"

cd "$(dirname "$0")/.."

say() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# Use sudo for docker if this user isn't in the docker group.
DOCKER=(docker)
docker info >/dev/null 2>&1 || DOCKER=(sudo docker)

# --- 0. Environment file ------------------------------------------------------
if [[ ! -f .env ]]; then
	cp .env.example .env
	chmod 600 .env
	echo "Created .env from .env.example. Fill it in (APP_ENV=production, DATABASE_URL,"
	echo "OPENAI_API_KEY, RATE_LIMIT_SECRET, ALLOWED_ORIGINS, BREVO_*), then re-run this script."
	exit 1
fi

# --- 1. Pick a port -----------------------------------------------------------
say "Checking ports already in use"

# Ports any process is listening on, plus ports published by running containers.
used_ports() {
	{
		ss -ltnH | awk '{print $4}' | sed -E 's/.*:([0-9]+)$/\1/'
		"${DOCKER[@]}" ps --format '{{.Ports}}' | grep -oE ':[0-9]+->' | tr -d ':->' || true
	} | sort -un
}

USED="$(used_ports)"
echo "In use: $(echo "$USED" | tr '\n' ' ')"

is_used() { grep -qx "$1" <<<"$USED"; }

# The port our own container already publishes, if it's running.
OWN_PORT="$("${DOCKER[@]}" port "$CONTAINER" 8080/tcp 2>/dev/null | head -1 | sed -E 's/.*:([0-9]+)$/\1/' || true)"
SAVED_PORT="$(grep -E '^API_PORT=' .env | tail -1 | cut -d= -f2 || true)"

if [[ -n "$OWN_PORT" ]]; then
	API_PORT="$OWN_PORT"
	echo "Keeping port $API_PORT (already used by $CONTAINER)."
elif [[ -n "$SAVED_PORT" ]] && ! is_used "$SAVED_PORT"; then
	API_PORT="$SAVED_PORT"
	echo "Reusing saved port $API_PORT."
else
	API_PORT=""
	for ((port = PORT_START; port <= PORT_END; port++)); do
		if ! is_used "$port"; then
			API_PORT="$port"
			break
		fi
	done
	[[ -n "$API_PORT" ]] || { echo "No free port between $PORT_START and $PORT_END." >&2; exit 1; }
	echo "Picked free port $API_PORT."
fi

# Save it so compose and the next deploy use the same port.
if grep -qE '^API_PORT=' .env; then
	sed -i -E "s/^API_PORT=.*/API_PORT=$API_PORT/" .env
else
	printf '\nAPI_PORT=%s\n' "$API_PORT" >>.env
fi

# --- 2. Build and start the container -----------------------------------------
say "Building and starting $CONTAINER on 127.0.0.1:$API_PORT"
"${DOCKER[@]}" compose up -d --build --remove-orphans

echo -n "Waiting for /healthz "
for _ in $(seq 1 30); do
	if curl -fsS "http://127.0.0.1:$API_PORT/healthz" >/dev/null 2>&1; then
		echo "ok"
		break
	fi
	echo -n "."
	sleep 1
done
if ! curl -fsS "http://127.0.0.1:$API_PORT/healthz" >/dev/null 2>&1; then
	echo
	echo "The API did not become healthy. Recent logs:" >&2
	"${DOCKER[@]}" compose logs --tail 50 api >&2
	exit 1
fi

# --- 3. nginx + TLS -----------------------------------------------------------
proxy_block() {
	cat <<EOF
    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host \$host;
        # Overwrite (don't append) so clients can't spoof their IP for rate limits.
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Chat answers are Server-Sent Events: pass each chunk straight through.
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        client_max_body_size 64k;
    }
EOF
}

write_site() {
	local tls="$1"
	local proxy
	proxy="$(proxy_block)"
	if [[ "$tls" == "yes" ]]; then
		local options=""
		[[ -f /etc/letsencrypt/options-ssl-nginx.conf ]] && options="    include /etc/letsencrypt/options-ssl-nginx.conf;"
		sudo tee "$SITE" >/dev/null <<EOF
# Managed by /opt/portfolio-api/deploy/setup.sh — edits will be overwritten.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
$options

$proxy
}
EOF
	else
		sudo tee "$SITE" >/dev/null <<EOF
# Managed by /opt/portfolio-api/deploy/setup.sh — edits will be overwritten.
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }

$proxy
}
EOF
	fi
	sudo ln -sf "$SITE" "/etc/nginx/sites-enabled/$DOMAIN"
	sudo nginx -t
	sudo systemctl reload nginx
}

say "Configuring nginx for $DOMAIN"
if sudo test -f "$CERT_DIR/fullchain.pem"; then
	write_site yes
else
	write_site no
	if command -v certbot >/dev/null; then
		say "Requesting a TLS certificate for $DOMAIN"
		sudo mkdir -p /var/www/html
		# certonly + webroot: certbot doesn't edit the nginx file, so re-runs stay clean.
		sudo certbot certonly --webroot -w /var/www/html -d "$DOMAIN" --non-interactive --agree-tos \
			--register-unsafely-without-email --keep-until-expiring
		write_site yes
	else
		echo "certbot is not installed; serving HTTP only. Install it with:" >&2
		echo "  sudo apt install -y certbot && ./deploy/setup.sh" >&2
	fi
fi

say "Done"
echo "Local:  curl http://127.0.0.1:$API_PORT/healthz"
echo "Public: curl https://$DOMAIN/healthz"
echo "Logs:   docker compose logs -f api"
