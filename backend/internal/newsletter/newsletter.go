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

	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/daveclinton/portfolio/backend/internal/visitor"
	"github.com/jackc/pgx/v5/pgxpool"
)

type provider interface {
	EnsureNewsletter(context.Context, sendy.Address, string) (sendy.NewsletterIDs, error)
	RequestSubscription(context.Context, string, sendy.NewsletterIDs, string, bool) (sendy.SubscriptionStatus, error)
	Confirm(context.Context, string, string) (bool, error)
	Unsubscribe(context.Context, string, string) (bool, error)
	ProcessQueue(context.Context) error
}

type Service struct {
	cfg          config.Config
	mail         provider
	log          *slog.Logger
	ready        atomic.Pointer[sendy.NewsletterIDs]
	privacy      visitor.Signer
	byIP, global *ratelimit.Window
	cooldown     *ratelimit.Locks
}

func New(cfg config.Config, db *pgxpool.Pool, log *slog.Logger) *Service {
	secret := cfg.RateLimitSecret
	if secret == "" {
		secret = "newsletter-local-development-secret"
	}
	return &Service{cfg: cfg, mail: sendy.NewNewsletter(cfg.SendyAPIKey, db, sendy.Address{Name: cfg.SendySenderName, Email: cfg.SendySenderEmail}, cfg.SiteURL, cfg.NewsletterPublicAPIURL, cfg.RateLimitSecret), log: log.With("product", "newsletter"),
		privacy: visitor.NewSigner(secret), byIP: ratelimit.NewWindow(5, time.Hour),
		global: ratelimit.NewWindow(100, 24*time.Hour), cooldown: ratelimit.NewLocks(sendy.ConfirmationCooldown)}
}

// Init prepares local consent storage even when new signups or delivery are
// disabled, so existing confirmation and unsubscribe links remain usable.
func (s *Service) Init(ctx context.Context) error {
	_, err := s.mail.EnsureNewsletter(ctx, sendy.Address{Name: s.cfg.SendySenderName, Email: s.cfg.SendySenderEmail}, s.cfg.SiteURL)
	return err
}

// Prepare application-owned tables and advance scheduled email delivery.
// No contact is enrolled and no confirmation is sent during setup.
func (s *Service) Run(ctx context.Context) {
	if !s.cfg.NewsletterEnabled || s.cfg.SendyAPIKey == "" || s.cfg.SendySenderEmail == "" {
		return
	}
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		if s.ready.Load() == nil {
			setupCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			ids, err := s.mail.EnsureNewsletter(setupCtx, sendy.Address{Name: s.cfg.SendySenderName, Email: s.cfg.SendySenderEmail}, s.cfg.SiteURL)
			cancel()
			if err != nil {
				s.log.Error("prepare email signup", "err", err)
			} else {
				s.ready.Store(&ids)
				s.log.Info("email signup ready")
			}
		}
		if s.ready.Load() != nil {
			queueCtx, queueCancel := context.WithTimeout(ctx, 45*time.Second)
			if err := s.mail.ProcessQueue(queueCtx); err != nil && ctx.Err() == nil {
				s.log.Error("process newsletter delivery", "err", err)
			}
			queueCancel()
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
	mux.HandleFunc("GET /newsletter/confirm", s.confirm)
	mux.HandleFunc("GET /newsletter/unsubscribe", s.unsubscribe)
}

// ListIDs shares readiness of the application-owned list with owner tools.
func (s *Service) ListIDs() (sendy.NewsletterIDs, bool) {
	ids := s.ready.Load()
	if ids == nil {
		return sendy.NewsletterIDs{}, false
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
		writeStatus(w, sendy.SubscriptionPending)
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

func writeStatus(w http.ResponseWriter, status sendy.SubscriptionStatus) {
	httpx.WriteJSON(w, http.StatusAccepted, map[string]sendy.SubscriptionStatus{"status": status})
}

func (s *Service) confirm(w http.ResponseWriter, r *http.Request) {
	s.subscriptionLink(w, r, true)
}
func (s *Service) unsubscribe(w http.ResponseWriter, r *http.Request) {
	s.subscriptionLink(w, r, false)
}
func (s *Service) subscriptionLink(w http.ResponseWriter, r *http.Request, confirm bool) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	var ok bool
	var err error
	if confirm {
		ok, err = s.mail.Confirm(ctx, r.URL.Query().Get("id"), r.URL.Query().Get("token"))
	} else {
		ok, err = s.mail.Unsubscribe(ctx, r.URL.Query().Get("id"), r.URL.Query().Get("token"))
	}
	if err != nil {
		httpx.Unavailable(w, "Could not update your email preferences. Please try again.", 60)
		return
	}
	if !ok {
		http.Error(w, "This email link is invalid or expired. Please return to the signup page or contact David.", http.StatusBadRequest)
		return
	}
	if confirm {
		http.Redirect(w, r, s.cfg.SiteURL+"/subscribe/confirmed", http.StatusSeeOther)
		return
	}
	html, _, err := sendy.RenderNote(sendy.Note{Title: "You’re unsubscribed.", Intro: "You won’t receive future newsletters from David.", SiteURL: s.cfg.SiteURL})
	if err != nil {
		http.Error(w, "You’re unsubscribed.", http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(html))
}
