package config

import (
	"strings"
	"testing"
)

func TestNewsletterSiteOriginIsValidatedWithoutChangingOtherConfiguration(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	t.Setenv("APP_ENV", "production")
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("x", 32))
	t.Setenv("EMBEDDINGS_PROVIDER", "off")
	for _, origin := range []string{"https://example.com/path", "https://user:password@example.com", "https://example.com?email=private", "http://example.com", "not a URL"} {
		t.Setenv("SITE_URL", origin)
		if _, err := Load(); err == nil {
			t.Errorf("invalid public origin accepted: %q", origin)
		}
	}
	t.Setenv("SITE_URL", "https://example.com/")
	cfg, err := Load()
	if err != nil || cfg.SiteURL != "https://example.com" || !cfg.NewsletterEnabled {
		t.Fatalf("valid newsletter configuration rejected: %+v %v", cfg, err)
	}
	t.Setenv("NEWSLETTER_ENABLED", "false")
	cfg, err = Load()
	if err != nil || cfg.NewsletterEnabled {
		t.Fatal("newsletter opt-out was ignored", err)
	}
}

func TestNewsletterDashboardRequiresCompleteOwnerConfiguration(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	t.Setenv("APP_ENV", "production")
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("x", 32))
	t.Setenv("EMBEDDINGS_PROVIDER", "off")
	t.Setenv("NEWSLETTER_ADMIN_ENABLED", "true")
	if _, err := Load(); err == nil {
		t.Fatal("dashboard accepted missing owner credentials")
	}
	t.Setenv("NEWSLETTER_GITHUB_CLIENT_ID", "client")
	t.Setenv("NEWSLETTER_GITHUB_CLIENT_SECRET", "secret")
	t.Setenv("NEWSLETTER_GITHUB_OWNER_ID", "42")
	t.Setenv("NEWSLETTER_TEST_EMAIL", "owner@example.com")
	for _, callback := range []string{"http://api.example.com/admin/newsletters/auth/callback", "https://user:pass@api.example.com/admin/newsletters/auth/callback", "https://api.example.com/wrong"} {
		t.Setenv("NEWSLETTER_OAUTH_CALLBACK_URL", callback)
		if _, err := Load(); err == nil {
			t.Fatal("invalid callback accepted")
		}
	}
	t.Setenv("NEWSLETTER_OAUTH_CALLBACK_URL", "https://api.example.com/admin/newsletters/auth/callback")
	cfg, err := Load()
	if err != nil || !cfg.NewsletterAdminEnabled || cfg.NewsletterGitHubOwnerID != 42 {
		t.Fatal("valid owner configuration rejected", err)
	}
	t.Setenv("NEWSLETTER_ADMIN_ENABLED", "false")
	t.Setenv("NEWSLETTER_GITHUB_CLIENT_SECRET", "")
	if _, err := Load(); err != nil {
		t.Fatal("disabled dashboard blocked the public API", err)
	}
}
