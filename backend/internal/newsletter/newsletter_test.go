package newsletter

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/config"
)

type fakeProvider struct {
	emails []string
	fail   bool
}

func (p *fakeProvider) EnsureNewsletter(context.Context, brevo.Address, string) (brevo.NewsletterIDs, error) {
	return brevo.NewsletterIDs{ListID: 2, TemplateID: 3}, nil
}
func (p *fakeProvider) RequestSubscription(_ context.Context, email string, ids brevo.NewsletterIDs, redirect string) error {
	p.emails = append(p.emails, email)
	if p.fail {
		return errors.New("delivery unavailable")
	}
	if ids.ListID != 2 || ids.TemplateID != 3 || redirect != "https://example.com/subscribe/confirmed" {
		return errors.New("bad provider request")
	}
	return nil
}

func testService() (*Service, *fakeProvider, http.Handler) {
	s := New(config.Config{NewsletterEnabled: true, SiteURL: "https://example.com", AllowedOrigins: []string{"https://example.com"}, RateLimitSecret: strings.Repeat("x", 32)}, slog.New(slog.NewTextHandler(io.Discard, nil)))
	p := &fakeProvider{}
	s.mail = p
	s.ready.Store(&brevo.NewsletterIDs{ListID: 2, TemplateID: 3})
	mux := http.NewServeMux()
	s.Routes(mux)
	return s, p, mux
}

func submit(handler http.Handler, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest("POST", "/newsletter/subscribe", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r.Header.Set("Origin", "https://example.com")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	return w
}

func TestValidSignupStaysPendingAndRepeatedRequestsDoNotSendMoreMail(t *testing.T) {
	_, p, h := testService()
	for range 2 {
		w := submit(h, `{"email":" Visitor@example.com ","consent":true}`)
		if w.Code != 202 || !strings.Contains(w.Body.String(), `"pending"`) {
			t.Fatalf("signup: %d %s", w.Code, w.Body)
		}
	}
	if len(p.emails) != 1 || p.emails[0] != "Visitor@example.com" {
		t.Fatalf("confirmation repeated or address changed: %v", p.emails)
	}
}

func TestInvalidInputAndMissingConsentNeverReachTheProvider(t *testing.T) {
	_, p, h := testService()
	for _, body := range []string{`{"email":"not an email","consent":true}`, `{"email":"x@example.com","consent":false}`, `{"email":"David <x@example.com>","consent":true}`, `{"email":"x@example.com\r\nBcc:bad@example.com","consent":true}`, `[]`, strings.Repeat("x", 2049)} {
		if w := submit(h, body); w.Code != 400 {
			t.Fatalf("invalid input accepted: %d", w.Code)
		}
	}
	if len(p.emails) != 0 {
		t.Fatal("invalid form sent mail")
	}
}

func TestHoneypotAndUnavailableServiceDoNotClaimActualEnrollment(t *testing.T) {
	s, p, h := testService()
	if w := submit(h, `{"email":"x@example.com","consent":true,"website":"bot"}`); w.Code != 202 {
		t.Fatal(w.Code)
	}
	if len(p.emails) != 0 {
		t.Fatal("honeypot sent mail")
	}
	s.ready.Store(nil)
	if w := submit(h, `{"email":"x@example.com","consent":true}`); w.Code != 503 || w.Header().Get("Retry-After") == "" {
		t.Fatal("unavailable service pretended to accept signup")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/newsletter/status", nil))
	if strings.Contains(w.Body.String(), `true`) {
		t.Fatal("availability is incorrect")
	}
}

func TestProviderFailureReleasesTheEmailCooldownForRetry(t *testing.T) {
	_, p, h := testService()
	p.fail = true
	if w := submit(h, `{"email":"x@example.com","consent":true}`); w.Code != 503 {
		t.Fatal(w.Code)
	}
	p.fail = false
	if w := submit(h, `{"email":"x@example.com","consent":true}`); w.Code != 202 || len(p.emails) != 2 {
		t.Fatal("retry remained locked")
	}
}

func TestRateLimitAndForeignOriginBlockExtraConfirmationMail(t *testing.T) {
	_, p, h := testService()
	r := httptest.NewRequest("POST", "/newsletter/subscribe", strings.NewReader(`{"email":"x@example.com","consent":true}`))
	r.Header.Set("Origin", "https://elsewhere.example")
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	if w.Code != 403 || len(p.emails) != 0 {
		t.Fatal("foreign site sent confirmation")
	}
	for range 5 {
		submit(h, `{"email":"x@example.com","consent":true}`)
	}
	w = submit(h, `{"email":"x@example.com","consent":true}`)
	if w.Code != 429 || w.Header().Get("Retry-After") == "" || len(p.emails) != 1 {
		t.Fatal("repeated mail was not limited")
	}
}

func TestDisabledConfigurationDoesNotProvisionAnything(t *testing.T) {
	s, _, _ := testService()
	s.ready.Store(nil)
	s.cfg.NewsletterEnabled = false
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	s.Run(ctx)
	if s.ready.Load() != nil {
		t.Fatal("disabled newsletter was provisioned")
	}
}

func TestProvisioningMakesOnlyNewsletterStatusReadyAndStopsOnShutdown(t *testing.T) {
	s, p, h := testService()
	s.ready.Store(nil)
	s.cfg.BrevoAPIKey = "test-key"
	s.cfg.BrevoSenderEmail = "notes@example.com"
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() { s.Run(ctx); close(done) }()
	deadline := time.Now().Add(time.Second)
	for s.ready.Load() == nil && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if s.ready.Load() == nil {
		t.Fatal("provisioning never enabled signup")
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest("GET", "/newsletter/status", nil))
	if !strings.Contains(w.Body.String(), `true`) || len(p.emails) != 0 {
		t.Fatal("setup enrolled a contact or failed readiness")
	}
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("newsletter worker did not stop")
	}
}
