package askai

import (
	"context"
	"errors"
	"fmt"
	"html"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/openai"
)

// This process runs one API instance, as do the existing rate limits. Admit a
// single recovery probe after cooldown; other readers keep the evidence view.
type providerAvailability struct {
	mu         sync.Mutex
	reason     string
	until      time.Time
	probing    bool
	generation uint64
}

func (p *providerAvailability) allow(now time.Time) (bool, string, uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.reason == "" {
		return true, "", 0
	}
	if now.Before(p.until) || p.probing {
		return false, p.reason, 0
	}
	p.probing = true
	p.generation++
	return true, p.reason, p.generation
}

func (p *providerAvailability) blocked(now time.Time) (bool, string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.reason != "" && now.Before(p.until), p.reason
}

func (p *providerAvailability) fail(reason string, until time.Time) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.reason, p.until, p.probing = reason, until, false
	p.generation++
}

func (p *providerAvailability) endProbe(token uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if token != 0 && token == p.generation {
		p.probing = false
	}
}

func (p *providerAvailability) recovered(token uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.reason == "" || token == 0 || token != p.generation || !p.probing {
		return
	}
	p.reason, p.until, p.probing = "", time.Time{}, false
	p.generation++
}

func providerFailure(err error) string {
	if err == nil || errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
		return ""
	}
	if isCreditExhaustion(err) {
		return "credits_exhausted"
	}
	var apiError *openai.APIError
	if errors.As(err, &apiError) {
		switch {
		case apiError.Status == 401:
			return "authentication_failed"
		case apiError.Status == 429:
			return "rate_limited"
		case apiError.Status >= 500:
			return "provider_unavailable"
		}
	}
	var networkError net.Error
	if errors.As(err, &networkError) {
		return "provider_unavailable"
	}
	return ""
}

func (s *Service) observeProviderError(err error) string {
	reason := providerFailure(err)
	if reason == "" {
		return ""
	}
	delay := time.Duration(s.cfg.AIProviderCooldownSeconds) * time.Second
	if delay <= 0 {
		delay = 5 * time.Minute
	}
	if reason == "rate_limited" || reason == "provider_unavailable" {
		delay = 30 * time.Second
	}
	s.availability.fail(reason, time.Now().Add(delay))
	if reason == "credits_exhausted" || reason == "authentication_failed" {
		detail := "AI-generated replies are unavailable. "
		if reason == "credits_exhausted" {
			detail += "OpenAI reported an exhausted credit balance or billing/spend limit. Review billing and add credits or adjust the applicable limit. No balance amount is inferred from this error."
		} else {
			detail += "OpenAI rejected the configured API credential. Replace the key in the backend environment and recreate the API container."
		}
		s.notifyOperator(reason, detail)
	}
	return reason
}

// Operational messages never contain visitor prompts, answers or credentials.
// Existing expiring locks deduplicate each event kind for an hour per process.
func (s *Service) notifyOperator(kind, detail string) {
	if s.mail == nil || !s.cfg.OperationalAlerts || s.operatorAlerts == nil {
		return
	}
	token, ok := s.operatorAlerts.Acquire(kind)
	if !ok {
		return
	}
	s.goBackground(func(ctx context.Context) {
		body := "<h1>Assistant needs attention</h1><p>" + html.EscapeString(detail) + "</p>" +
			"<p>Evidence-only browsing remains available when the database is healthy. Check backend logs for the provider request ID.</p>"
		if err := s.sendMail(ctx, "Ask AI: "+strings.ReplaceAll(kind, "_", " "), body, httpx.NewUUID()); err != nil {
			s.operatorAlerts.Release(kind, token)
			s.log.Error("send operational alert", "kind", kind, "err", err)
		}
	})
}

func evidenceOnlyReply(sources []source) string {
	var reply strings.Builder
	reply.WriteString("AI-generated replies are temporarily unavailable.")
	shown := 0
	for _, src := range sources {
		if shown == 2 {
			break
		}
		if strings.TrimSpace(src.Excerpt) != "" {
			if shown == 0 {
				reply.WriteString(" The excerpts below are published background information, not a generated role assessment or project brief.")
			}
			fmt.Fprintf(&reply, "\n\n> %s", strings.ReplaceAll(excerpt(src.Excerpt, 400), "\n", "\n> "))
			shown++
		}
	}
	if shown == 0 {
		reply.WriteString(" Ask about a named project or company, browse the homepage, or contact David directly.")
	}
	return reply.String()
}
