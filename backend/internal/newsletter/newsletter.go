// Package newsletter handles voluntary email subscriptions independently of chat.
package newsletter

import (
	"context"
	"log/slog"
	"math"
	"mime"
	"net/http"
	"net/mail"
	"slices"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
	"github.com/daveclinton/portfolio/backend/internal/visitor"
)

type provider interface {
	EnsureNewsletter(context.Context, brevo.Address, string) (brevo.NewsletterIDs, error)
	RequestSubscription(context.Context, string, brevo.NewsletterIDs, string, bool) (brevo.SubscriptionStatus, error)
}

type Service struct {
	cfg          config.Config
	mail         provider
	log          *slog.Logger
	ready        atomic.Pointer[brevo.NewsletterIDs]
	privacy      visitor.Signer
	byIP, global *ratelimit.Window
	cooldown     *ratelimit.Locks
}

func New(cfg config.Config, log *slog.Logger) *Service {
	secret := cfg.RateLimitSecret
	if secret == "" {
		secret = "newsletter-local-development-secret"
	}
	return &Service{cfg: cfg, mail: brevo.New(cfg.BrevoAPIKey), log: log.With("product", "newsletter"),
		privacy: visitor.NewSigner(secret), byIP: ratelimit.NewWindow(5, time.Hour),
		global: ratelimit.NewWindow(100, 24*time.Hour), cooldown: ratelimit.NewLocks(15 * time.Minute)}
}

// Provision named resources once per process, retrying failures without blocking
// the existing API. This never sends a subscription email or enrolls a contact.
func (s *Service) Run(ctx context.Context) {
	if !s.cfg.NewsletterEnabled || s.cfg.BrevoAPIKey == "" || s.cfg.BrevoSenderEmail == "" {
		return
	}
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		if s.ready.Load() == nil {
			setupCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			ids, err := s.mail.EnsureNewsletter(setupCtx, brevo.Address{Name: s.cfg.BrevoSenderName, Email: s.cfg.BrevoSenderEmail}, s.cfg.SiteURL)
			cancel()
			if err != nil {
				s.log.Error("prepare email signup", "err", err)
			} else {
				s.ready.Store(&ids)
				s.log.Info("email signup ready")
			}
		}
		s.byIP.Sweep()
		s.global.Sweep()
		s.cooldown.Sweep()
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (s *Service) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /newsletter/status", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		httpx.WriteJSON(w, http.StatusOK, map[string]bool{"enabled": s.ready.Load() != nil})
	})
	mux.HandleFunc("POST /newsletter/subscribe", s.subscribe)
}

// ListIDs shares the already-provisioned newsletter resources with owner tools.
func (s *Service) ListIDs() (brevo.NewsletterIDs, bool) {
	ids := s.ready.Load()
	if ids == nil {
		return brevo.NewsletterIDs{}, false
	}
	return *ids, true
}

func (s *Service) subscribe(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if origin := r.Header.Get("Origin"); origin != "" && !slices.Contains(s.cfg.AllowedOrigins, origin) {
		httpx.WriteJSON(w, http.StatusForbidden, httpx.Problem{Detail: "This signup request could not be accepted."})
		return
	}
	mediaType, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if mediaType != "application/json" {
		httpx.WriteJSON(w, http.StatusUnsupportedMediaType, httpx.Problem{Detail: "Send the signup form as JSON."})
		return
	}
	body, err := httpx.ReadJSON(r, 2048)
	if err != nil {
		httpx.BadRequest(w, "Please check the signup form.", nil)
		return
	}
	input, ok := body.(map[string]any)
	if !ok {
		httpx.BadRequest(w, "Please check the signup form.", nil)
		return
	}
	email, _ := input["email"].(string)
	email = strings.TrimSpace(email)
	parsed, parseErr := mail.ParseAddress(email)
	consent, _ := input["consent"].(bool)
	if !consent || len(email) > 254 || parseErr != nil || parsed.Address != email || strings.ContainsAny(email, "\r\n") {
		httpx.BadRequest(w, "Enter your email address and choose Keep me posted to subscribe.", nil)
		return
	}
	if trap, _ := input["website"].(string); trap != "" {
		writeStatus(w, brevo.SubscriptionPending)
		return
	}
	ids := s.ready.Load()
	if ids == nil {
		httpx.Unavailable(w, "Email signup is unavailable right now. Please try again later.", 60)
		return
	}
	ip := s.privacy.Hash("newsletter-ip:" + httpx.ClientIP(r, s.cfg.TrustProxyHeaders))
	for _, check := range []struct {
		window *ratelimit.Window
		key    string
	}{{s.global, "newsletter"}, {s.byIP, ip}} {
		result := check.window.Allow(check.key)
		if !result.Allowed {
			w.Header().Set("Retry-After", strconv.Itoa(max(1, int(math.Ceil(time.Until(result.Reset).Seconds())))))
			httpx.WriteJSON(w, http.StatusTooManyRequests, httpx.Problem{Detail: "Please wait a little before trying again."})
			return
		}
	}
	emailKey := s.privacy.Hash("newsletter-email:" + strings.ToLower(email))
	token, allowed := s.cooldown.Acquire(emailKey)
	ctx, cancel := context.WithTimeout(r.Context(), 12*time.Second)
	defer cancel()
	status, err := s.mail.RequestSubscription(ctx, email, *ids, s.cfg.SiteURL+"/subscribe/confirmed", allowed)
	if err != nil {
		s.cooldown.Release(emailKey, token)
		s.log.Error("request subscription confirmation", "err", err)
		httpx.Unavailable(w, "We couldn’t send the confirmation. Please try again shortly.", 60)
		return
	}
	writeStatus(w, status)
}

func writeStatus(w http.ResponseWriter, status brevo.SubscriptionStatus) {
	httpx.WriteJSON(w, http.StatusAccepted, map[string]brevo.SubscriptionStatus{"status": status})
}
