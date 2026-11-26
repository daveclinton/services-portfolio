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
}

func TestNewsletterDashboardRequiresCompleteOwnerConfiguration(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	t.Setenv("APP_ENV", "production")
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("x", 32))
	t.Setenv("EMBEDDINGS_PROVIDER", "off")
	cfg, err := Load()
	if err != nil || cfg.NewsletterAdminEnabled {
		t.Fatal("missing OAuth credentials should keep owner routes unavailable without blocking startup", err)
	}
	t.Setenv("NEWSLETTER_GITHUB_CLIENT_ID", "client")
	if _, err := Load(); err == nil {
		t.Fatal("partial owner credentials were accepted")
	}
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
	cfg, err = Load()
	if err != nil || !cfg.NewsletterAdminEnabled || cfg.NewsletterGitHubOwnerID != 42 {
		t.Fatal("valid owner configuration rejected", err)
	}
	t.Setenv("NEWSLETTER_ADMIN_ENABLED", "false")
	cfg, err = Load()
	if err != nil || !cfg.NewsletterAdminEnabled {
		t.Fatal("obsolete boolean flag disabled a configured dashboard", err)
	}
	t.Setenv("NEWSLETTER_GITHUB_CLIENT_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("obsolete boolean flag bypassed owner configuration validation")
	}
}

func TestSendySettingsRequireValidEmailLinkConfigurationAndIgnoreOldProvider(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	t.Setenv("EMBEDDINGS_PROVIDER", "off")
	t.Setenv("BREVO_API_KEY", "old-key")
	cfg, err := Load()
	if err != nil || cfg.SendyAPIKey != "" || cfg.AlertsEnabled() {
		t.Fatal("old provider settings enabled email", err)
	}
	t.Setenv("SENDY_API_KEY", "snd_key_test")
	t.Setenv("SENDY_SENDER_EMAIL", "notes@example.com")
	t.Setenv("SENDY_ALERT_TO_EMAIL", "owner@example.com")
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("s", 32))
	for _, origin := range []string{"https://api.example.com/path", "https://user:pass@api.example.com", "https://api.example.com?token=private", "not a URL"} {
		t.Setenv("NEWSLETTER_PUBLIC_API_URL", origin)
		if _, err := Load(); err == nil {
			t.Fatal("invalid API origin accepted", origin)
		}
	}
	t.Setenv("NEWSLETTER_PUBLIC_API_URL", "https://api.example.com/")
	cfg, err = Load()
	if err != nil || !cfg.AlertsEnabled() || cfg.NewsletterPublicAPIURL != "https://api.example.com" || cfg.NewsletterTestEmail != "owner@example.com" {
		t.Fatal("valid Sendy configuration rejected", err)
	}
	t.Setenv("RATE_LIMIT_SECRET", "")
	if _, err := Load(); err == nil {
		t.Fatal("confirmation signing accepted an empty secret")
	}
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("s", 32))
	t.Setenv("SENDY_SENDER_EMAIL", "David <notes@example.com>")
	if _, err := Load(); err == nil {
		t.Fatal("display name accepted as sender address")
	}
}

func TestFeaturesAreEnabledWithoutBooleanEnvironmentSwitches(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	for _, key := range []string{"TRUST_PROXY_HEADERS", "SENDY_OPERATIONAL_ALERTS", "NEWSLETTER_ENABLED", "NEWSLETTER_ADMIN_ENABLED"} {
		t.Setenv(key, "false")
	}
	cfg, err := Load()
	if err != nil || !cfg.TrustProxyHeaders || !cfg.OperationalAlerts || !cfg.NewsletterEnabled {
		t.Fatal("obsolete boolean environment settings changed feature defaults", err)
	}
}

func TestCloudinaryIsOptionalButAllOrNothing(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://test.invalid/test")
	t.Setenv("RATE_LIMIT_SECRET", strings.Repeat("x", 32))
	t.Setenv("EMBEDDINGS_PROVIDER", "off")
	t.Setenv("SITE_URL", "http://localhost:3000")
	if _, err := Load(); err != nil {
		t.Fatalf("Cloudinary should be optional: %v", err)
	}
	t.Setenv("CLOUDINARY_CLOUD_NAME", "my-cloud")
	if _, err := Load(); err == nil || !strings.Contains(err.Error(), "CLOUDINARY") {
		t.Fatalf("a partial Cloudinary setup was accepted: %v", err)
	}
	t.Setenv("CLOUDINARY_API_KEY", "123")
	t.Setenv("CLOUDINARY_API_SECRET", "secret")
	cfg, err := Load()
	if err != nil || cfg.CloudinaryCloudName != "my-cloud" {
		t.Fatalf("a complete Cloudinary setup was rejected: %v", err)
	}
	t.Setenv("CLOUDINARY_CLOUD_NAME", "https://res.cloudinary.com/my-cloud")
	if _, err := Load(); err == nil {
		t.Fatal("a URL was accepted as the cloud name")
	}
}
