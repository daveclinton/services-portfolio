package askai

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/openai"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
)

func TestProviderCooldownAdmitsOneRecoveryProbe(t *testing.T) {
	var circuit providerAvailability
	now := time.Now()
	circuit.fail("credits_exhausted", now.Add(time.Minute))
	if ready, reason, _ := circuit.allow(now); ready || reason != "credits_exhausted" {
		t.Fatal("outage was not held")
	}
	var group sync.WaitGroup
	var mu sync.Mutex
	var probes []uint64
	for range 20 {
		group.Go(func() {
			ready, _, probe := circuit.allow(now.Add(2 * time.Minute))
			if ready {
				mu.Lock()
				probes = append(probes, probe)
				mu.Unlock()
			}
		})
	}
	group.Wait()
	if len(probes) != 1 {
		t.Fatalf("admitted %d probes, want 1", len(probes))
	}
	circuit.endProbe(0)
	if ready, _, _ := circuit.allow(now.Add(2 * time.Minute)); ready {
		t.Fatal("unrelated request released the probe")
	}
	circuit.fail("authentication_failed", now.Add(3*time.Minute))
	_, _, next := circuit.allow(now.Add(4 * time.Minute))
	circuit.endProbe(probes[0])
	if ready, _, _ := circuit.allow(now.Add(4 * time.Minute)); ready {
		t.Fatal("stale probe released its replacement")
	}
	circuit.recovered(0)
	if ready, _, _ := circuit.allow(now.Add(4 * time.Minute)); ready {
		t.Fatal("an older successful request cleared a newer outage")
	}
	circuit.recovered(next)
	if ready, reason, _ := circuit.allow(now.Add(4 * time.Minute)); !ready || reason != "" {
		t.Fatal("success did not restore service")
	}
}

func TestProviderFailureDistinguishesBillingFromRateLimits(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{&openai.APIError{Status: 429, Body: `{"error":{"code":"credit_balance_exhausted"}}`}, "credits_exhausted"},
		{&openai.APIError{Status: 429, Body: `{"error":{"code":"rate_limit_exceeded"}}`}, "rate_limited"},
		{&openai.APIError{Status: 401, Body: `{"error":{"code":"expired_secret_key"}}`}, "authentication_failed"},
		{&openai.APIError{Status: 503}, "provider_unavailable"},
		{openai.ErrTruncated, ""}, {context.Canceled, ""}, {context.DeadlineExceeded, ""}, {nil, ""},
	}
	for _, tc := range cases {
		if got := providerFailure(tc.err); got != tc.want {
			t.Errorf("failure(%v)=%q, want %q", tc.err, got, tc.want)
		}
	}
}

type recordingMailer struct {
	mu       sync.Mutex
	messages []brevo.Email
	fail     bool
}

func (m *recordingMailer) Send(_ context.Context, email brevo.Email) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.messages = append(m.messages, email)
	if m.fail {
		return errors.New("mail unavailable")
	}
	return nil
}

func TestOperationalNotificationsDeduplicateAndRetry(t *testing.T) {
	mail := &recordingMailer{}
	s := &Service{mail: mail, cfg: config.Config{OperationalAlerts: true}, operatorAlerts: ratelimit.NewLocks(time.Hour), log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	var group sync.WaitGroup
	for range 20 {
		group.Go(func() { s.notifyOperator("credits_exhausted", "Review provider billing") })
	}
	group.Wait()
	s.Wait()
	if len(mail.messages) != 1 {
		t.Fatalf("sent %d notices, want 1", len(mail.messages))
	}
	if !httpx.IsUUID(mail.messages[0].IdempotencyKey) {
		t.Fatal("provider idempotency key is not a UUID")
	}
	mail.fail = true
	s.notifyOperator("authentication_failed", "Replace the key")
	s.Wait()
	mail.fail = false
	s.notifyOperator("authentication_failed", "Replace the key")
	s.Wait()
	if len(mail.messages) != 3 {
		t.Fatal("failed delivery did not release the alert claim")
	}
}

func TestConversationNotificationPolicy(t *testing.T) {
	for _, mode := range []string{"", "important", "all", "off"} {
		for _, status := range []string{"error", "no_evidence", "degraded"} {
			if shouldNotifyConversation(mode, turnLog{Status: status, AlertReason: "hiring"}) {
				t.Errorf("%s/%s triggered a visitor email", mode, status)
			}
		}
	}
	if shouldNotifyConversation("important", turnLog{Status: "completed", Question: "Hello"}) {
		t.Fatal("greeting consumed the notification")
	}
	if !shouldNotifyConversation("important", turnLog{Status: "completed", AlertReason: "hiring"}) {
		t.Fatal("qualified hiring interest was missed")
	}
	if shouldNotifyConversation("all", turnLog{Status: "completed", DeviceType: "bot"}) {
		t.Fatal("bot triggered a visitor email")
	}
	if shouldNotifyConversation("off", turnLog{Status: "completed", AlertReason: "contact"}) {
		t.Fatal("off mode sent a notification")
	}
}

func TestRequestBudgetWarnsOnceWithoutClaimingACreditBalance(t *testing.T) {
	cfg := config.Config{Env: "production", RateLimitSecret: strings.Repeat("x", 32), AIGlobalDailyLimit: 10, OperationalAlerts: true, EmbeddingsProvider: "off"}
	s := New(cfg, nil, slog.New(slog.NewTextHandler(io.Discard, nil)))
	mail := &recordingMailer{}
	s.mail = mail
	for range 7 {
		s.enforce(httptest.NewRecorder(), httptest.NewRequest("POST", "/ask-ai/chat", nil), s.limits.chat)
	}
	s.Wait()
	if len(mail.messages) != 0 {
		t.Fatal("warning fired before the threshold")
	}
	for range 3 {
		s.enforce(httptest.NewRecorder(), httptest.NewRequest("POST", "/ask-ai/chat", nil), s.limits.chat)
	}
	s.Wait()
	if len(mail.messages) != 1 || !strings.Contains(mail.messages[0].HTML, "not your OpenAI credit balance") {
		t.Fatal("missing or misleading request-budget warning")
	}
}

func TestOpportunityReasonAndWorkflowGrounding(t *testing.T) {
	decision := intentDecision{Intent: generalIntent, Plan: responsePlan{Goal: "learn"}}
	if opportunityReason("What projects has he shipped?", "chat", decision) != "" {
		t.Fatal("ordinary browsing was treated as a lead")
	}
	if opportunityReason("Go role", "role_fit", decision) != "hiring" {
		t.Fatal("role comparison did not qualify")
	}
	if opportunityReason("How can I contact David?", "chat", decision) != "contact" {
		t.Fatal("contact intent was missed")
	}
	if reason := opportunityReason("Plan an order lookup pilot", "project_scope", decision); reason != "contact" || !shouldNotifyConversation("important", turnLog{Status: "completed", AlertReason: reason}) {
		t.Fatal("successful project discovery did not qualify as contact interest")
	}
	decision.PolicyOverride = true
	if opportunityReason("Hire him", "role_fit", decision) != "" {
		t.Fatal("policy attack qualified as hiring interest")
	}
	if opportunityReason("Plan a project", "project_scope", decision) != "" {
		t.Fatal("policy attack qualified as project interest")
	}
	decision.PolicyOverride = false
	decision.Plan.Workflow = "role_fit"
	messages := buildMessages("ROLE TEXT", "KNOWN EVIDENCE", nil, nil, decision)
	if messages[2] != (openai.Message{Role: "system", Content: workflowGuidance["role_fit"]}) {
		t.Fatal("workflow must use the fixed application guidance")
	}
	if messages[len(messages)-1].Content != "ROLE TEXT" {
		t.Fatal("role text lost its user boundary")
	}
}

func TestEvidenceOnlyReplyDoesNotInventAnAssessment(t *testing.T) {
	got := evidenceOnlyReply([]source{{Excerpt: "Published fact"}})
	if !strings.Contains(got, "not a generated role assessment or project brief") || !strings.Contains(got, "Published fact") {
		t.Fatalf("unlabelled fallback: %s", got)
	}
}
