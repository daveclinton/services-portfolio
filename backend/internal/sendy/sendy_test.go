package sendy

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type mailTransport func(*http.Request) (*http.Response, error)

func (f mailTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func providerResponse(status int, value any) *http.Response {
	data, _ := json.Marshal(value)
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(string(data))), Header: http.Header{}}
}
func jobResponse(id, status string) map[string]any {
	return map[string]any{"data": map[string]any{"type": "emails", "id": id, "attributes": map[string]any{"status": status}}}
}
func validEmail() Email {
	return Email{Sender: Address{Name: "David, Portfolio", Email: "notes@example.com"}, To: []Address{{Email: "reader@example.com"}}, Subject: "A note", HTML: "<p>Hello</p>", Text: "Hello", IdempotencyKey: "stable-key"}
}
func TestSendUsesSendyJSONAPIAndStableIdempotency(t *testing.T) {
	c := New("snd_key_test")
	var first string
	calls := 0
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.URL.String() != apiURL+"/emails" || r.Method != "POST" || r.Header.Get("Authorization") != "Bearer snd_key_test" || r.Header.Get("Content-Type") != MediaType || r.Header.Get("Accept") != MediaType || r.Header.Get("Idempotency-Key") != "stable-key" {
			t.Fatal("incorrect Sendy request")
		}
		body, _ := io.ReadAll(r.Body)
		if calls == 1 {
			first = string(body)
			return nil, errors.New("private reader@example.com network failure")
		}
		if string(body) != first {
			t.Fatal("retry payload changed")
		}
		var payload struct {
			Data struct {
				Type       string            `json:"type"`
				Attributes map[string]string `json:"attributes"`
			} `json:"data"`
		}
		if err := json.Unmarshal(body, &payload); err != nil {
			t.Fatal(err)
		}
		a := payload.Data.Attributes
		if payload.Data.Type != "emails" || a["to"] != "reader@example.com" || a["from"] != `"David, Portfolio" <notes@example.com>` || a["html"] != "<p>Hello</p>" || a["text"] != "Hello" || len(a) != 5 {
			t.Fatal("wrong JSON:API attributes", a)
		}
		return providerResponse(202, jobResponse("123", "queued")), nil
	})
	if err := c.Send(context.Background(), validEmail()); err == nil || strings.Contains(err.Error(), "reader@example.com") {
		t.Fatal("transport error was hidden or leaked private data")
	}
	if err := c.Send(context.Background(), validEmail()); err != nil {
		t.Fatal(err)
	}
}
func TestProviderRefusalsMalformedSuccessAndFailedReplay(t *testing.T) {
	for _, status := range []int{400, 401, 402, 403, 409, 422, 429, 500, 503} {
		c := New("test")
		c.http.Transport = mailTransport(func(*http.Request) (*http.Response, error) {
			return providerResponse(status, map[string]any{"errors": []any{map[string]string{"detail": "private reader@example.com"}}}), nil
		})
		err := c.Send(context.Background(), validEmail())
		var api *APIError
		if !errors.As(err, &api) || api.Status != status || strings.Contains(err.Error(), "reader@example.com") {
			t.Fatal("incorrect/redaction failure", err)
		}
	}
	for _, body := range []any{map[string]any{}, jobResponse("", "queued"), jobResponse("123", "unknown"), jobResponse("123", "failed")} {
		c := New("test")
		c.http.Transport = mailTransport(func(*http.Request) (*http.Response, error) { return providerResponse(202, body), nil })
		if err := c.Send(context.Background(), validEmail()); err == nil {
			t.Fatal("incomplete or failed job treated as a successful send")
		}
	}
}
func TestMessageLimitsAndSingleRecipientAreEnforcedBeforeSending(t *testing.T) {
	c := New("test")
	c.http.Transport = mailTransport(func(*http.Request) (*http.Response, error) { t.Fatal("invalid email reached Sendy"); return nil, nil })
	for _, change := range []func(*Email){func(e *Email) { e.To = append(e.To, Address{Email: "other@example.com"}) }, func(e *Email) { e.IdempotencyKey = "" }, func(e *Email) { e.HTML = strings.Repeat("x", ContentLimit+1) }, func(e *Email) { e.Subject = strings.Repeat("é", 128) }, func(e *Email) { e.Subject = "bad\r\nBcc: other@example.com" }} {
		email := validEmail()
		change(&email)
		if err := c.Send(context.Background(), email); err == nil {
			t.Fatal("invalid message accepted")
		}
	}
}
func TestGetJobUsesAccountAuthenticationAndChecksIdentity(t *testing.T) {
	c := New("test")
	c.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method != "GET" || r.URL.Path != "/api/v1/emails/123" || r.Header.Get("Authorization") != "Bearer test" {
			t.Fatal("wrong job lookup")
		}
		return providerResponse(200, jobResponse("123", "accepted")), nil
	})
	job, err := c.GetJob(context.Background(), "123")
	if err != nil || job.Attributes.Status != "accepted" {
		t.Fatal(err)
	}
}
