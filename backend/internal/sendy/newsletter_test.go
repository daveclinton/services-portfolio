package sendy

import (
	"context"
	"encoding/json"
	"html"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func testClient(t *testing.T) *Client {
	t.Helper()
	dsn := os.Getenv("NEWSLETTER_STUDIO_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set NEWSLETTER_STUDIO_TEST_DATABASE_URL for isolated PostgreSQL email tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	name := "sendy_test_" + strings.ReplaceAll(httpx.NewUUID(), "-", "")
	quoted := pgx.Identifier{name}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		t.Fatal(err)
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = name
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		pool.Close()
		_, err := admin.Exec(context.Background(), "DROP SCHEMA "+quoted+" CASCADE")
		if err != nil {
			t.Error(err)
		}
		admin.Close()
	})
	c := NewNewsletter("test", pool, Address{Email: "notes@example.com"}, "https://site.test", "https://api.test", strings.Repeat("x", 32))
	if err = c.Init(ctx); err != nil {
		t.Fatal(err)
	}
	return c
}
func recordEmails(c *Client) *[]Email {
	messages := []Email{}
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method == "GET" {
			return providerResponse(200, jobResponse(strings.TrimPrefix(r.URL.Path, "/api/v1/emails/"), "accepted")), nil
		}
		var payload struct {
			Data struct {
				Attributes map[string]string `json:"attributes"`
			} `json:"data"`
		}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		a := payload.Data.Attributes
		messages = append(messages, Email{Subject: a["subject"], HTML: a["html"], Text: a["text"], To: []Address{{Email: a["to"]}}, IdempotencyKey: r.Header.Get("Idempotency-Key")})
		return providerResponse(202, jobResponse(httpx.NewUUID(), "queued")), nil
	})
	return &messages
}
func TestLocalDoubleOptInAndUnsubscribeSurviveRestart(t *testing.T) {
	c := testClient(t)
	messages := recordEmails(c)
	ctx := context.Background()
	for range 2 {
		status, err := c.RequestSubscription(ctx, "Reader@example.com", NewsletterIDs{1}, "", true)
		if err != nil || status != SubscriptionPending {
			t.Fatal(status, err)
		}
	}
	if len(*messages) != 1 {
		t.Fatal("confirmation cooldown failed")
	}
	var id, nonce string
	if err := c.db.QueryRow(ctx, `SELECT id::text,confirmation_nonce::text FROM newsletter_subscribers`).Scan(&id, &nonce); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(html.UnescapeString((*messages)[0].HTML), c.link("confirm", id, c.token("confirm", id, nonce))) {
		t.Fatal("confirmation link missing")
	}
	other := NewNewsletter("test", c.db, c.sender, c.siteURL, c.publicURL, strings.Repeat("x", 32))
	if ok, err := other.Confirm(ctx, id, "wrong"); ok || err != nil {
		t.Fatal("invalid token accepted")
	}
	if ok, err := other.Confirm(ctx, id, c.token("confirm", id, nonce)); !ok || err != nil {
		t.Fatal(ok, err)
	}
	status, err := c.RequestSubscription(ctx, "reader@example.com", NewsletterIDs{1}, "", true)
	if err != nil || status != SubscriptionSubscribed || len(*messages) != 1 {
		t.Fatal("confirmed contact emailed again")
	}
	for range 2 {
		if ok, err := other.Unsubscribe(ctx, id, c.token("unsubscribe", id, "")); !ok || err != nil {
			t.Fatal("unsubscribe is not idempotent", err)
		}
	}
	if ok, err := c.Confirm(ctx, id, c.token("confirm", id, nonce)); ok || err != nil {
		t.Fatal("old confirmation restored opt-out")
	}
	status, err = c.RequestSubscription(ctx, "reader@example.com", NewsletterIDs{1}, "", true)
	if err != nil || status != SubscriptionSuppressed || len(*messages) != 1 {
		t.Fatal("signup reset opt-out")
	}
}
func TestConfirmationTimeoutKeepsNonceAndPayloadForRetry(t *testing.T) {
	c := testClient(t)
	ctx := context.Background()
	calls := 0
	firstKey, firstBody := "", ""
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		body, _ := io.ReadAll(r.Body)
		if calls == 1 {
			firstKey, firstBody = r.Header.Get("Idempotency-Key"), string(body)
			return nil, io.ErrUnexpectedEOF
		}
		if firstKey != r.Header.Get("Idempotency-Key") || firstBody != string(body) {
			t.Fatal("lost response enabled a duplicate confirmation")
		}
		return providerResponse(202, jobResponse("123", "queued")), nil
	})
	if _, err := c.RequestSubscription(ctx, "Reader@example.com", NewsletterIDs{1}, "", true); err == nil {
		t.Fatal("timeout hidden")
	}
	if _, err := c.RequestSubscription(ctx, "reader@example.com", NewsletterIDs{1}, "", true); err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Fatal(calls)
	}
}
func TestExpiredConfirmationCannotEnrollAndImportPreservesSuppression(t *testing.T) {
	c := testClient(t)
	recordEmails(c)
	ctx := context.Background()
	_, err := c.RequestSubscription(ctx, "reader@example.com", NewsletterIDs{1}, "", true)
	if err != nil {
		t.Fatal(err)
	}
	var id, nonce string
	_ = c.db.QueryRow(ctx, `SELECT id::text,confirmation_nonce::text FROM newsletter_subscribers`).Scan(&id, &nonce)
	_, err = c.db.Exec(ctx, `UPDATE newsletter_subscribers SET confirmation_expires_at=NOW()-INTERVAL '1 minute'`)
	if err != nil {
		t.Fatal(err)
	}
	if ok, err := c.Confirm(ctx, id, c.token("confirm", id, nonce)); ok || err != nil {
		t.Fatal("expired token enrolled contact")
	}
	stamp := time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	csv := "email,status,confirmed_at\nreader@example.com,subscribed," + stamp + "\nREADER@example.com,suppressed,\nreader@example.com,subscribed," + stamp + "\n"
	if n, err := c.ImportSubscribers(ctx, strings.NewReader(csv)); err != nil || n != 3 {
		t.Fatal(n, err)
	}
	var status string
	_ = c.db.QueryRow(ctx, `SELECT status FROM newsletter_subscribers`).Scan(&status)
	if status != "suppressed" {
		t.Fatal("import reset suppression")
	}
	if _, err := c.ImportSubscribers(ctx, strings.NewReader("email,status,confirmed_at\nnew@example.com,subscribed,\n")); err == nil {
		t.Fatal("import invented confirmation consent")
	}
}
func TestNoteEscapesVisitorContentAndRendersApplicationConfirmationLink(t *testing.T) {
	note := ConfirmationNote("https://site.test")
	note.ConfirmationURL = "https://api.test/newsletter/confirm?id=example&token=token"
	note.Sections = []NoteSection{{Label: "Question", Text: "<script>alert(1)</script>"}}
	html, text, err := RenderNote(note)
	if err != nil || strings.Contains(html, "<script>") || !strings.Contains(html, "&lt;script&gt;") || !strings.Contains(html, "https://api.test/newsletter/confirm?id=example&amp;token=token") || !strings.Contains(text, note.ConfirmationURL) || !strings.Contains(html, "<!--[if mso]>") {
		t.Fatal("invalid or unsafe email template", err)
	}
}
