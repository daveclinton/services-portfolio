package sendy

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"
)

func importAudience(t *testing.T, c *Client) {
	t.Helper()
	stamp := time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	csv := "email,status,confirmed_at\nreader@example.com,subscribed," + stamp + "\npending@example.com,pending,\noptout@example.com,suppressed,\n"
	if _, err := c.ImportSubscribers(context.Background(), strings.NewReader(csv)); err != nil {
		t.Fatal(err)
	}
}
func createCampaign(t *testing.T, c *Client, name string) int64 {
	t.Helper()
	html, err := RenderNewsletter("A personal note", "Hello **reader**.", c.siteURL)
	if err != nil {
		t.Fatal(err)
	}
	id, err := c.CreateCampaign(context.Background(), name, "A personal note", html, c.sender, 1)
	if err != nil {
		t.Fatal(err)
	}
	return id
}
func TestCampaignsScheduleCancelAndDeliverOnlyConfirmedSubscribers(t *testing.T) {
	c := testClient(t)
	importAudience(t, c)
	messages := recordEmails(c)
	ctx := context.Background()
	id := createCampaign(t, c, "portfolio-newsletter/one")
	if count, err := c.CampaignAudience(ctx, 1); err != nil || count != 1 {
		t.Fatal(count, err)
	}
	if err := c.UpdateCampaign(ctx, id, map[string]any{"scheduledAt": time.Now().Add(time.Hour).Format(time.RFC3339)}); err != nil {
		t.Fatal(err)
	}
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	if len(*messages) != 0 {
		t.Fatal("future schedule sent early")
	}
	if err := c.SetCampaignStatus(ctx, id, "draft"); err != nil {
		t.Fatal(err)
	}
	if err := c.SendCampaign(ctx, id); err != nil {
		t.Fatal(err)
	}
	if err := c.SendCampaign(ctx, id); err == nil {
		t.Fatal("same campaign submitted twice")
	}
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	if len(*messages) != 1 || (*messages)[0].To[0].Email != "reader@example.com" || strings.Contains((*messages)[0].HTML, unsubscribePlaceholder) || !strings.Contains((*messages)[0].HTML, "https://api.test/newsletter/unsubscribe?") {
		t.Fatal("wrong audience or missing real unsubscribe link")
	}
	campaign, err := c.GetCampaign(ctx, id)
	if err != nil || campaign.Status != "in_process" {
		t.Fatal("queue acceptance claimed provider acceptance", err)
	}
	if _, err = c.db.Exec(ctx, `UPDATE newsletter_deliveries SET next_attempt_at=NOW()`); err != nil {
		t.Fatal(err)
	}
	if err = c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	campaign, err = c.GetCampaign(ctx, id)
	if err != nil || campaign.Status != "sent" || len(*messages) != 1 {
		t.Fatal("status polling resent email or failed to finish", err)
	}
	if err = c.UpdateCampaign(ctx, id, map[string]any{"subject": "Changed"}); err == nil {
		t.Fatal("submitted content was mutable")
	}
}
func TestAmbiguousSubmissionRetriesFrozenPayloadAndKeyAfterRestart(t *testing.T) {
	c := testClient(t)
	importAudience(t, c)
	ctx := context.Background()
	id := createCampaign(t, c, "portfolio-newsletter/recovery")
	firstBody, firstKey := "", ""
	calls := 0
	transport := mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		body, _ := io.ReadAll(r.Body)
		if calls == 1 {
			firstBody, firstKey = string(body), r.Header.Get("Idempotency-Key")
			return nil, io.ErrUnexpectedEOF
		}
		if firstBody != string(body) || firstKey != r.Header.Get("Idempotency-Key") {
			t.Fatal("retry changed submission identity or payload")
		}
		return providerResponse(202, jobResponse("123", "queued")), nil
	})
	c.http.Transport = transport
	if err := c.SendCampaign(ctx, id); err != nil {
		t.Fatal(err)
	}
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	other := NewNewsletter("new-api-key", c.db, c.sender, c.siteURL, "https://changed-api.test", strings.Repeat("y", 32))
	other.http.Transport = transport
	if _, err := c.db.Exec(ctx, `UPDATE newsletter_deliveries SET next_attempt_at=NOW()`); err != nil {
		t.Fatal(err)
	}
	if err := other.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Fatal(calls)
	}
	var count int
	_ = c.db.QueryRow(ctx, `SELECT COUNT(*) FROM newsletter_deliveries`).Scan(&count)
	if count != 1 {
		t.Fatal("restart duplicated audience")
	}
}
func TestQueuedBroadcastRechecksOptOutAndPollsBounceSuppression(t *testing.T) {
	c := testClient(t)
	importAudience(t, c)
	ctx := context.Background()
	id := createCampaign(t, c, "portfolio-newsletter/bounce")
	calls := 0
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.Method == "POST" {
			return providerResponse(202, jobResponse("123", "queued")), nil
		}
		body := jobResponse("123", "accepted")
		a := body["data"].(map[string]any)["attributes"].(map[string]any)
		a["delivery_status"] = "bounced"
		return providerResponse(200, body), nil
	})
	if err := c.SendCampaign(ctx, id); err != nil {
		t.Fatal(err)
	}
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	_, _ = c.db.Exec(ctx, `UPDATE newsletter_deliveries SET next_attempt_at=NOW()`)
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	var status string
	_ = c.db.QueryRow(ctx, `SELECT status FROM newsletter_subscribers WHERE email='reader@example.com'`).Scan(&status)
	if status != "suppressed" || calls != 2 {
		t.Fatal("bounce did not suppress local subscriber", status, calls)
	}
}
func TestCreditsRefusalRetriesWithoutChangingKeyAndTerminalFailuresStop(t *testing.T) {
	c := testClient(t)
	importAudience(t, c)
	ctx := context.Background()
	id := createCampaign(t, c, "portfolio-newsletter/credits")
	response := 402
	key := ""
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if key != "" && key != r.Header.Get("Idempotency-Key") {
			t.Fatal("credits retry changed key")
		}
		key = r.Header.Get("Idempotency-Key")
		return providerResponse(response, map[string]any{"errors": []any{map[string]string{"detail": "private reader@example.com"}}}), nil
	})
	_ = c.SendCampaign(ctx, id)
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	campaign, _ := c.GetCampaign(ctx, id)
	if campaign.Status != "in_process" {
		t.Fatal("credit refusal discarded queued campaign")
	}
	response = 400
	_, _ = c.db.Exec(ctx, `UPDATE newsletter_deliveries SET next_attempt_at=NOW()`)
	if err := c.ProcessQueue(ctx); err != nil {
		t.Fatal(err)
	}
	campaign, _ = c.GetCampaign(ctx, id)
	if campaign.Status != "suspended" {
		data, _ := json.Marshal(campaign)
		t.Fatal("terminal failure claimed sent", string(data), strconv.Itoa(response))
	}
}
