package brevo

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

type mailTransport func(*http.Request) (*http.Response, error)

func (f mailTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestSendUsesDocumentedIdempotencyAndAcceptsDuplicate(t *testing.T) {
	client := New("test-key")
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		var payload struct {
			Headers map[string]string `json:"headers"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		if payload.Headers["idempotencyKey"] != "0b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90" {
			t.Fatal("missing provider idempotency key")
		}
		return &http.Response{StatusCode: 400, Body: io.NopCloser(strings.NewReader(`{"code":"duplicate_parameter","message":"already accepted"}`)), Header: http.Header{}}, nil
	})
	if err := client.Send(context.Background(), Email{IdempotencyKey: "0b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90"}); err != nil {
		t.Fatal(err)
	}
}
