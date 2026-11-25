package sendy

import (
	"context"
	"crypto/hmac"
	_ "embed"
	"errors"
	"net/url"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
)

//go:embed schema.sql
var schema string

type NewsletterIDs struct{ ListID int64 }
type SubscriptionStatus string

const (
	SubscriptionPending    SubscriptionStatus = "pending"
	SubscriptionSubscribed SubscriptionStatus = "subscribed"
	SubscriptionSuppressed SubscriptionStatus = "suppressed"
)

func (c *Client) Init(ctx context.Context) error {
	if c.db == nil {
		return errors.New("newsletter database is not configured")
	}
	_, err := c.db.Exec(ctx, schema)
	return err
}
func (c *Client) EnsureNewsletter(ctx context.Context, _ Address, _ string) (NewsletterIDs, error) {
	if err := c.Init(ctx); err != nil {
		return NewsletterIDs{}, err
	}
	return NewsletterIDs{ListID: 1}, nil
}
func (c *Client) token(purpose, id, nonce string) string {
	return c.signer.Hash("newsletter-" + purpose + ":" + id + ":" + nonce)
}
func (c *Client) link(action, id, token string) string {
	return c.publicURL + "/newsletter/" + action + "?id=" + url.QueryEscape(id) + "&token=" + url.QueryEscape(token)
}

// A database advisory lock enforces confirmation cooldown across requests and API
// instances. Opt-outs are never changed by signup or an old confirmation link.
func (c *Client) RequestSubscription(ctx context.Context, email string, _ NewsletterIDs, _ string, allowConfirmation bool) (SubscriptionStatus, error) {
	conn, err := c.db.Acquire(ctx)
	if err != nil {
		return "", err
	}
	// Use a session lock so each durable nonce/cooldown update is committed
	// before the network call. A lost response must never generate a new key.
	if _, err = conn.Exec(ctx, `SELECT pg_advisory_lock(hashtextextended(lower($1),42))`, email); err != nil {
		_ = conn.Hijack().Close(context.Background())
		return "", err
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		var unlocked bool
		if err := conn.QueryRow(cleanup, `SELECT pg_advisory_unlock(hashtextextended(lower($1),42))`, email).Scan(&unlocked); err != nil || !unlocked {
			_ = conn.Hijack().Close(cleanup)
		} else {
			conn.Release()
		}
	}()

	_, err = conn.Exec(ctx, `INSERT INTO newsletter_subscribers(id,email,status,confirmation_nonce,confirmation_expires_at) VALUES($1::text::uuid,lower($2),'pending',$3::text::uuid,NOW()+INTERVAL '48 hours') ON CONFLICT(email) DO NOTHING`, httpx.NewUUID(), email, httpx.NewUUID())
	if err != nil {
		return "", err
	}
	var id, nonce string
	var status SubscriptionStatus
	var expires time.Time
	var sent *time.Time
	err = conn.QueryRow(ctx, `SELECT id::text,confirmation_nonce::text,status,confirmation_expires_at,confirmation_sent_at,email FROM newsletter_subscribers WHERE email=lower($1)`, email).Scan(&id, &nonce, &status, &expires, &sent, &email)
	if err != nil {
		return "", err
	}
	if status != SubscriptionPending || !allowConfirmation || (sent != nil && time.Since(*sent) < ConfirmationCooldown) {
		return status, nil
	}
	if time.Now().After(expires) || sent != nil {
		nonce = httpx.NewUUID()
		_, err = conn.Exec(ctx, `UPDATE newsletter_subscribers SET confirmation_nonce=$1::text::uuid,confirmation_expires_at=NOW()+INTERVAL '48 hours',confirmation_sent_at=NULL WHERE id=$2::text::uuid`, nonce, id)
		if err != nil {
			return "", err
		}
	}
	note := ConfirmationNote(c.siteURL)
	note.ConfirmationURL = c.link("confirm", id, c.token("confirm", id, nonce))
	html, text, err := RenderNote(note)
	if err != nil {
		return "", err
	}
	if err = c.Send(ctx, Email{Sender: c.sender, To: []Address{{Email: email}}, Subject: "Confirm your email · David Clinton", HTML: html, Text: text, IdempotencyKey: "confirm/" + id + "/" + nonce}); err != nil {
		return "", err
	}
	_, err = conn.Exec(ctx, `UPDATE newsletter_subscribers SET confirmation_sent_at=NOW(),updated_at=NOW() WHERE id=$1::text::uuid`, id)
	if err != nil {
		return "", err
	}
	return SubscriptionPending, nil
}

func (c *Client) Confirm(ctx context.Context, id, token string) (bool, error) {
	if !httpx.IsUUID(id) || len(token) != 64 {
		return false, nil
	}
	var nonce string
	err := c.db.QueryRow(ctx, `SELECT confirmation_nonce::text FROM newsletter_subscribers WHERE id=$1::text::uuid`, id).Scan(&nonce)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if !hmac.Equal([]byte(token), []byte(c.token("confirm", id, nonce))) {
		return false, nil
	}
	result, err := c.db.Exec(ctx, `UPDATE newsletter_subscribers SET status='subscribed',confirmed_at=COALESCE(confirmed_at,NOW()),updated_at=NOW() WHERE id=$1::text::uuid AND status!='suppressed' AND confirmation_expires_at>NOW()`, id)
	return err == nil && result.RowsAffected() == 1, err
}
func (c *Client) Unsubscribe(ctx context.Context, id, token string) (bool, error) {
	if !httpx.IsUUID(id) || len(token) != 64 || !hmac.Equal([]byte(token), []byte(c.token("unsubscribe", id, ""))) {
		return false, nil
	}
	result, err := c.db.Exec(ctx, `UPDATE newsletter_subscribers SET status='suppressed',updated_at=NOW() WHERE id=$1::text::uuid`, id)
	return err == nil && result.RowsAffected() == 1, err
}
