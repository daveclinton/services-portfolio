// Package studio implements the owner's newsletter writing and delivery desk.
package studio

import (
	"context"
	_ "embed"
	"log/slog"
	"net/http"
	"time"
	_ "time/tzdata"

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
	"github.com/daveclinton/portfolio/backend/internal/visitor"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
)

//go:embed schema.sql
var schema string

type campaignProvider interface {
	CreateCampaign(context.Context, string, string, string, brevo.Address, int64) (int64, error)
	UpdateCampaign(context.Context, int64, map[string]any) error
	GetCampaign(context.Context, int64) (brevo.Campaign, error)
	FindCampaign(context.Context, string) (brevo.Campaign, error)
	SendTestCampaign(context.Context, int64, string) error
	SendCampaign(context.Context, int64) error
	SetCampaignStatus(context.Context, int64, string) error
	CampaignAudience(context.Context, int64) (int, error)
}

type Service struct {
	cfg         config.Config
	db          *pgxpool.Pool
	log         *slog.Logger
	mail        campaignProvider
	listIDs     func() (brevo.NewsletterIDs, bool)
	privacy     visitor.Signer
	oauth       oauth2.Config
	identityURL string
	http        *http.Client
	loginLimit  *ratelimit.Window
}

func New(cfg config.Config, db *pgxpool.Pool, log *slog.Logger, listIDs func() (brevo.NewsletterIDs, bool)) *Service {
	return &Service{cfg: cfg, db: db, log: log.With("product", "newsletter-studio"), mail: brevo.New(cfg.BrevoAPIKey), listIDs: listIDs,
		privacy: visitor.NewSigner(cfg.RateLimitSecret), http: &http.Client{Timeout: 12 * time.Second}, identityURL: "https://api.github.com/user",
		loginLimit: ratelimit.NewWindow(10, time.Hour),
		oauth: oauth2.Config{ClientID: cfg.NewsletterGitHubClientID, ClientSecret: cfg.NewsletterGitHubClientSecret, RedirectURL: cfg.NewsletterOAuthCallbackURL,
			Endpoint: oauth2.Endpoint{AuthURL: "https://github.com/login/oauth/authorize", TokenURL: "https://github.com/login/oauth/access_token", AuthStyle: oauth2.AuthStyleInParams}},
	}
}

func (s *Service) Init(ctx context.Context) error {
	if !s.cfg.NewsletterAdminEnabled {
		return nil
	}
	_, err := s.db.Exec(ctx, schema)
	return err
}

func (s *Service) Routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /admin/newsletters/session", s.session)
	mux.HandleFunc("GET /admin/newsletters/auth/login", s.login)
	mux.HandleFunc("GET /admin/newsletters/auth/callback", s.callback)
	mux.HandleFunc("POST /admin/newsletters/logout", s.protect(s.logout))
	mux.HandleFunc("GET /admin/newsletters/meta", s.protect(s.metadata))
	mux.HandleFunc("GET /admin/newsletters/drafts", s.protect(s.listDrafts))
	mux.HandleFunc("POST /admin/newsletters/drafts", s.protect(s.createDraft))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/save", s.protect(s.saveDraft))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/preview", s.protect(s.preview))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/test", s.protect(s.campaignAction))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/send", s.protect(s.campaignAction))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/schedule", s.protect(s.campaignAction))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/cancel", s.protect(s.campaignAction))
	mux.HandleFunc("POST /admin/newsletters/drafts/{id}/refresh", s.protect(s.refresh))
}
