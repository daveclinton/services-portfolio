CREATE TABLE IF NOT EXISTS newsletter_subscribers (
 id uuid PRIMARY KEY, email text NOT NULL UNIQUE,
 status text NOT NULL CHECK (status IN ('pending','subscribed','suppressed')),
 confirmation_nonce uuid NOT NULL, confirmation_expires_at timestamptz NOT NULL,
 confirmation_sent_at timestamptz, confirmed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name text NOT NULL UNIQUE, subject text NOT NULL, html text NOT NULL,
 sender_email text NOT NULL, sender_name text NOT NULL,
 status text NOT NULL DEFAULT 'draft', scheduled_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
 campaign_id bigint NOT NULL REFERENCES newsletter_campaigns(id),
 subscriber_id uuid NOT NULL REFERENCES newsletter_subscribers(id),
 job_id text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
 html text NOT NULL,
 next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
 delivery_status text NOT NULL DEFAULT '',
 last_error text NOT NULL DEFAULT '',
 PRIMARY KEY(campaign_id,subscriber_id)
);

CREATE INDEX IF NOT EXISTS newsletter_delivery_queue_idx ON newsletter_deliveries(next_attempt_at)
 WHERE status IN ('pending','queued','processing','accepted');
