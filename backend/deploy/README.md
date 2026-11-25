# Deployment

The site runs on Vercel. The API and database run on a VPS with Docker, nginx and certbot.

## First setup

1. Point `api.daveclintonn.cc` at the VPS.
2. Give the VPS a read-only GitHub deploy key, using the SSH host alias `github-services-portfolio`.
3. Clone the repository:

   ```bash
   sudo mkdir -p /opt/services-portfolio && sudo chown "$USER": /opt/services-portfolio
   git clone git@github-services-portfolio:daveclinton/services-portfolio.git /opt/services-portfolio
   cd /opt/services-portfolio/backend
   ```

4. Create `.env`:

   ```bash
   cp .env.example .env && chmod 600 .env
   sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
   sed -i "s|^RATE_LIMIT_SECRET=.*|RATE_LIMIT_SECRET=$(openssl rand -base64 48 | tr -d '\n')|" .env
   nano .env
   ```

   Set these, then add your OpenAI and Sendy keys. Leave `DATABASE_URL`, `API_PORT` and `DB_PORT` alone.

   ```dotenv
   APP_ENV=production
   ALLOWED_ORIGINS=https://www.daveclintonn.cc,https://daveclintonn.cc
   SITE_URL=https://www.daveclintonn.cc
   NEWSLETTER_PUBLIC_API_URL=https://api.daveclintonn.cc
   ```

5. Run `./deploy/setup.sh`. It starts Docker and sets up nginx and TLS for this domain only. It is safe to run again.
6. Optionally copy an existing database with `./deploy/import-db.sh 'postgresql://...'`.
7. In Vercel, set `NEXT_PUBLIC_API_URL=https://api.daveclintonn.cc` and the same `CONTENT_REVALIDATION_SECRET` as the API, then redeploy.

Check it with `curl https://api.daveclintonn.cc/healthz`, then ask a real question, since this does not test the OpenAI key.

## Update

Pushes to `main` deploy the API after checks pass. To deploy by hand:

```bash
cd /opt/services-portfolio
git switch main && git pull --ff-only origin main
bash backend/deploy/update.sh
```

Updates do not change nginx. Image uploads need the config `setup.sh` generates. To apply it to an existing server, run `./deploy/setup.sh` from `backend/`. It overwrites this site's nginx file.

Failed deployments are not rolled back automatically. Check the workflow logs.

## Automatic deploys

1. Create a key: `ssh-keygen -t ed25519 -f /tmp/portfolio-actions-key -N '' -C services-portfolio-github-actions`
2. Add these GitHub Actions secrets:

   | Secret | Value |
   | --- | --- |
   | `VPS_HOST` | Hostname or IP, SSH port 22 |
   | `VPS_USER` | Deploy user with Docker access that does not prompt for a password |
   | `VPS_SSH_KEY` | The private key |
   | `VPS_KNOWN_HOSTS` | Host key entries verified through a trusted source |

3. On the VPS, from a clean `main`, authorize the public key:

   ```bash
   cd /opt/services-portfolio
   bash backend/deploy/install-github-deploy.sh 'ssh-ed25519 AAAA... services-portfolio-github-actions'
   ```

4. Run **Deploy VPS API** once from GitHub Actions, then delete the local key.

## Import subscribers

Back up the database and cancel scheduled sends in the old provider first. Then, with `DATABASE_URL` set:

```bash
go run ./cmd/newsletter-import -file subscribers.csv
```

```csv
email,status,confirmed_at
reader@example.com,subscribed,2026-09-01T12:00:00Z
optout@example.com,suppressed,
```

Mark someone `subscribed` only with proof of consent. Use `suppressed` for anyone unsubscribed or blocked; imports never undo an opt-out. No email is sent.

## Knowledge updates

Open a tunnel with `ssh -L 5433:127.0.0.1:<DB_PORT> <user>@<vps>`. Point `DATABASE_URL` at `127.0.0.1:5433` with the VPS password, then run the [knowledge pipeline](../../knowledge-backend/README.md).
