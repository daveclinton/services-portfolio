CREATE TABLE IF NOT EXISTS newsletter_studio_sessions (
 token_hash text PRIMARY KEY, github_id bigint NOT NULL, login text NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_studio_oauth (
 state_hash text PRIMARY KEY, verifier text NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS newsletter_studio_drafts (
 id uuid PRIMARY KEY, subject text NOT NULL DEFAULT '', markdown text NOT NULL DEFAULT '',
 revision bigint NOT NULL DEFAULT 1, state text NOT NULL DEFAULT 'draft',
 campaign_id bigint NOT NULL DEFAULT 0, operation text NOT NULL DEFAULT '',
 scheduled_at timestamptz, tested_revision bigint NOT NULL DEFAULT 0,
 last_error text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
);
-- Existing provider campaign IDs must never be interpreted as local IDs.
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS delivery_provider text NOT NULL DEFAULT 'legacy';
ALTER TABLE newsletter_studio_drafts ALTER COLUMN delivery_provider SET DEFAULT 'sendy';
UPDATE newsletter_studio_drafts SET delivery_provider='sendy'
 WHERE delivery_provider='legacy' AND campaign_id=0 AND operation='' AND state IN ('draft','error');
