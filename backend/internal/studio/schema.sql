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

ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'newsletter';
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS slug text NOT NULL DEFAULT '';
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS published_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS legacy boolean NOT NULL DEFAULT false;
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS first_published_at timestamptz;
CREATE TABLE IF NOT EXISTS studio_deleted_posts (
 slug text PRIMARY KEY, deleted_at timestamptz NOT NULL DEFAULT NOW()
);
-- NULL sends to all confirmed subscribers.
ALTER TABLE newsletter_studio_drafts ADD COLUMN IF NOT EXISTS recipients text[];
CREATE INDEX IF NOT EXISTS studio_drafts_kind_updated ON newsletter_studio_drafts(kind,updated_at DESC,id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS studio_post_draft_slug ON newsletter_studio_drafts(slug) WHERE kind='post' AND slug<>'';
CREATE TABLE IF NOT EXISTS studio_posts (
 slug text PRIMARY KEY, draft_id uuid NOT NULL UNIQUE REFERENCES newsletter_studio_drafts(id),
 title text NOT NULL, description text NOT NULL, markdown text NOT NULL, html text NOT NULL,
 revision bigint NOT NULL, legacy boolean NOT NULL DEFAULT false, reading_minutes integer NOT NULL DEFAULT 1,
 published_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS studio_posts_published ON studio_posts(published_at DESC,slug);
CREATE TABLE IF NOT EXISTS studio_media (
 id text PRIMARY KEY, content_type text NOT NULL, data bytea NOT NULL,
 width integer NOT NULL, height integer NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW()
);
