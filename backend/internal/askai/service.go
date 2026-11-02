// Package askai is the portfolio's "Ask AI" product: grounded chat and
// search over the knowledge base. Each product gets its own package and
// mounts its routes on the shared server.
package askai

import (
	"context"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/openai"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
	"github.com/daveclinton/portfolio/backend/internal/visitor"
)

// developmentPrivacySecret only hashes local data when no secret is set;
// config.Load refuses to start production without RATE_LIMIT_SECRET.
const developmentPrivacySecret = "portfolio-local-development-privacy-secret"

type Service struct {
	cfg     config.Config
	db      *pgxpool.Pool
	ai      *openai.Client
	mail    *brevo.Client // nil when alerts aren't configured
	log     *slog.Logger
	signer  visitor.Signer
	privacy visitor.Signer
	limits  limits
	locks   *ratelimit.Locks

	background sync.WaitGroup
}

func New(cfg config.Config, db *pgxpool.Pool, log *slog.Logger) *Service {
	privacySecret := cfg.RateLimitSecret
	if privacySecret == "" {
		privacySecret = developmentPrivacySecret
	}
	s := &Service{
		cfg:     cfg,
		db:      db,
		ai:      openai.New(cfg.OpenAIAPIKey),
		log:     log.With("product", "ask-ai"),
		signer:  visitor.NewSigner(cfg.RateLimitSecret),
		privacy: visitor.NewSigner(privacySecret),
		limits:  newLimits(cfg),
		locks:   ratelimit.NewLocks(chatLockTTL),
	}
	if cfg.AlertsEnabled() {
		s.mail = brevo.New(cfg.BrevoAPIKey)
	}
	return s
}

func (s *Service) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /ask-ai/chat", s.handleChat)
	mux.HandleFunc("POST /ask-ai/search", s.handleSearch)
}

// Run does periodic housekeeping until ctx is cancelled: it frees memory held
// by expired rate-limit entries and purges expired conversations. This replaces
// the Vercel cron job.
func (s *Service) Run(ctx context.Context) {
	sweep := time.NewTicker(time.Minute)
	purge := time.NewTicker(6 * time.Hour)
	defer sweep.Stop()
	defer purge.Stop()
	s.purge(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-sweep.C:
			s.limits.sweep()
			s.locks.Sweep()
		case <-purge.C:
			s.purge(ctx)
		}
	}
}

func (s *Service) purge(ctx context.Context) {
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()
	deleted, err := s.purgeExpired(ctx)
	if err != nil {
		s.log.Error("purge expired conversations", "err", err)
		return
	}
	if deleted > 0 {
		s.log.Info("purged expired conversations", "deleted", deleted)
	}
}

// goBackground runs work after the response has been sent, like Next.js
// after(). It's detached from the request context so it survives the
// client disconnecting, and Wait lets shutdown finish it.
func (s *Service) goBackground(work func(ctx context.Context)) {
	s.background.Go(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		work(ctx)
	})
}

// Wait blocks until background work has finished.
func (s *Service) Wait() { s.background.Wait() }
