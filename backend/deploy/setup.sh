#!/usr/bin/env bash
# Run on the VPS from the backend folder of the cloned repo:  ./deploy/setup.sh
#
# 1. Picks host ports for the API and Postgres that no other process or
#    container is using (or keeps the ones from the last run).
# 2. Builds and starts both containers, bound to 127.0.0.1 only.
# 3. Writes the nginx site for $DOMAIN, gets a Let's Encrypt certificate and
#    reloads nginx.
#
# Safe to re-run on every deploy.
set -euo pipefail

DOMAIN="${DOMAIN:-api.daveclintonn.cc}"
CONTAINER="portfolio-api"
PORT_START="${PORT_START:-8080}"
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
	# Fresh random password for the bundled Postgres (hex is URL-safe).
	sed -i -E "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
	sed -i -E "s/^APP_ENV=.*/APP_ENV=production/" .env
	chmod 600 .env
	echo "No .env found, so created one with a generated POSTGRES_PASSWORD. Fill in OPENAI_API_KEY,"
	echo "RATE_LIMIT_SECRET, ALLOWED_ORIGINS and BREVO_*, then re-run this script."
	exit 1
fi
if grep -qE '^POSTGRES_PASSWORD=(change-me-locally)?$' .env; then
	echo "Set a real POSTGRES_PASSWORD in .env (openssl rand -hex 24)." >&2
	exit 1
fi

# --- 1. Pick ports ------------------------------------------------------------
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

# pick_port VAR CONTAINER CONTAINER_PORT START
# Keeps the port our container already publishes, else the saved one if it's
# still free, else the first free port from START upward. Saves it to .env.
pick_port() {
	local var="$1" container="$2" container_port="$3" start="$4" port=""
	local own saved
	own="$("${DOCKER[@]}" port "$container" "$container_port/tcp" 2>/dev/null | head -1 | sed -E 's/.*:([0-9]+)$/\1/' || true)"
	saved="$(grep -E "^$var=" .env | tail -1 | cut -d= -f2 || true)"
	if [[ -n "$own" ]]; then
		port="$own"
		echo "$var: keeping $port (already used by $container)."
	elif [[ -n "$saved" ]] && ! is_used "$saved"; then
		port="$saved"
		echo "$var: reusing saved port $port."
	else
		for ((p = start; p <= start + 900; p++)); do
			if ! is_used "$p"; then
				port="$p"
				break
			fi
		done
		[[ -n "$port" ]] || { echo "No free port from $start." >&2; exit 1; }
		echo "$var: picked free port $port."
	fi
	USED="$(printf '%s\n%s' "$USED" "$port")" # don't hand the same port out twice
	if grep -qE "^$var=" .env; then
		sed -i -E "s/^$var=.*/$var=$port/" .env
	else
		printf '\n%s=%s\n' "$var" "$port" >>.env
	fi
	printf -v "$var" '%s' "$port"
}

pick_port API_PORT "$CONTAINER" 8080 "$PORT_START"
pick_port DB_PORT portfolio-db 5432 5433
pick_port EMBED_PORT portfolio-embeddings 80 8090

# --- 2. Build and start the container -----------------------------------------
say "Building and starting Postgres (127.0.0.1:$DB_PORT) and the API (127.0.0.1:$API_PORT)"
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
# Managed by backend/deploy/setup.sh in the portfolio repo — edits will be overwritten.
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
# Managed by backend/deploy/setup.sh in the portfolio repo — edits will be overwritten.
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
echo
echo "First deploy? Copy your existing data into the new database once:"
echo "  ./deploy/import-db.sh 'postgresql://...old-neon-url...'"
