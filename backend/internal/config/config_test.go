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
