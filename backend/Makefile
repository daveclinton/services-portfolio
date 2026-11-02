# Usage:
#   make run                      run locally with .env
#   make test                     vet + tests
#   make deploy VPS=clinton@1.2.3.4   copy to /opt/portfolio-api and (re)start it
VPS ?=
APP_DIR := /opt/portfolio-api

.PHONY: run test deploy logs

run:
	set -a && . ./.env && set +a && go run ./cmd/api

test:
	go vet ./...
	go test ./...

# Copies the source (never your local .env) and runs deploy/setup.sh on the
# server, which builds the image there, picks a port and configures nginx.
deploy: test
	@test -n "$(VPS)" || (echo "Set VPS, e.g. make deploy VPS=clinton@your-server-ip" && exit 1)
	ssh $(VPS) 'sudo mkdir -p $(APP_DIR) && sudo chown $$(id -un): $(APP_DIR)'
	rsync -az --delete --exclude .env --exclude bin/ ./ $(VPS):$(APP_DIR)/
	ssh -t $(VPS) 'cd $(APP_DIR) && ./deploy/setup.sh'

logs:
	ssh $(VPS) 'cd $(APP_DIR) && docker compose logs -f api'
