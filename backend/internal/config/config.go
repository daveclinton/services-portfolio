// Package config reads every setting the API needs from environment variables
// once at startup, validates them, and fails fast when production is misconfigured.
package config

import (
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Env               string // "development" or "production"
	Addr              string // listen address; only nginx should be able to reach it
	DatabaseURL       string
	AllowedOrigins    []string
	TrustProxyHeaders bool

	RateLimitSecret        string
	AIGlobalDailyLimit     int
	SearchGlobalDailyLimit int

	OpenAIAPIKey      string
	OpenAIChatModel   string
	OpenAIIntentModel string

	// Embeddings for semantic search, stored in our own pgvector table.
	// Provider "openai" (default when OPENAI_API_KEY is set) uses the OpenAI
	// embeddings API; "tei" uses a self-hosted Text Embeddings Inference
	// server at EmbeddingsURL; "off" disables semantic search. The prefixes
	// are task instructions some models expect (none for OpenAI).
	EmbeddingsProvider      string
	EmbeddingsURL           string
	EmbeddingModel          string
	EmbeddingDimensions     int
	EmbeddingQueryPrefix    string
	EmbeddingDocumentPrefix string

	SendyAPIKey                  string
	SendyAlertTo                 string
	SendySenderEmail             string
	SendySenderName              string
	ConversationAlerts           string
	OperationalAlerts            bool
	AIProviderCooldownSeconds    int
	SiteURL                      string
	NewsletterEnabled            bool
	NewsletterPublicAPIURL       string
	NewsletterAdminEnabled       bool
	NewsletterGitHubClientID     string
	NewsletterGitHubClientSecret string
	NewsletterGitHubOwnerID      int64
	NewsletterOAuthCallbackURL   string
	NewsletterTestEmail          string
	ContentRevalidationSecret    string

	ConversationRetentionDays int
}

func (c Config) Production() bool { return c.Env == "production" }

// RateLimitsEnabled is false only in development when no secret is configured,
// so local work doesn't need any setup. Production always enforces limits.
func (c Config) RateLimitsEnabled() bool {
	return c.Production() || c.RateLimitSecret != ""
}

func (c Config) AlertsEnabled() bool {
	return c.SendyAPIKey != "" && c.SendyAlertTo != "" && c.SendySenderEmail != ""
}

func Load() (Config, error) {
	c := Config{
		Env:               env("APP_ENV", "development"),
		Addr:              env("ADDR", "127.0.0.1:8080"),
		DatabaseURL:       env("DATABASE_URL", ""),
		AllowedOrigins:    list(env("ALLOWED_ORIGINS", "http://localhost:3000")),
		TrustProxyHeaders: true,

		RateLimitSecret:        env("RATE_LIMIT_SECRET", ""),
		AIGlobalDailyLimit:     positiveInt(env("AI_GLOBAL_DAILY_LIMIT", ""), 200),
		SearchGlobalDailyLimit: positiveInt(env("SEARCH_GLOBAL_DAILY_LIMIT", ""), 2000),

		OpenAIAPIKey:      env("OPENAI_API_KEY", ""),
		OpenAIChatModel:   env("OPENAI_CHAT_MODEL", "gpt-4.1-mini"),
		OpenAIIntentModel: env("OPENAI_INTENT_MODEL", "gpt-4o-mini"),

		EmbeddingsURL: env("EMBEDDINGS_URL", ""),

		SendyAPIKey:                  env("SENDY_API_KEY", ""),
		SendyAlertTo:                 env("SENDY_ALERT_TO_EMAIL", ""),
		SendySenderEmail:             env("SENDY_SENDER_EMAIL", ""),
		SendySenderName:              env("SENDY_SENDER_NAME", "David Clinton Portfolio"),
		ConversationAlerts:           env("SENDY_CONVERSATION_ALERTS", "important"),
		OperationalAlerts:            true,
		AIProviderCooldownSeconds:    positiveInt(env("AI_PROVIDER_COOLDOWN_SECONDS", ""), 300),
		SiteURL:                      strings.TrimRight(env("SITE_URL", "https://www.daveclintonn.cc"), "/"),
		NewsletterEnabled:            true,
		NewsletterPublicAPIURL:       strings.TrimRight(env("NEWSLETTER_PUBLIC_API_URL", "https://api.daveclintonn.cc"), "/"),
		NewsletterGitHubClientID:     env("NEWSLETTER_GITHUB_CLIENT_ID", ""),
		NewsletterGitHubClientSecret: env("NEWSLETTER_GITHUB_CLIENT_SECRET", ""),
		NewsletterOAuthCallbackURL:   env("NEWSLETTER_OAUTH_CALLBACK_URL", ""),
		NewsletterTestEmail:          env("NEWSLETTER_TEST_EMAIL", env("SENDY_ALERT_TO_EMAIL", "")),
		ContentRevalidationSecret:    env("CONTENT_REVALIDATION_SECRET", ""),

		ConversationRetentionDays: positiveInt(env("CONVERSATION_RETENTION_DAYS", ""), 30),
	}
	c.applyEmbeddingDefaults()
	c.NewsletterGitHubOwnerID, _ = strconv.ParseInt(env("NEWSLETTER_GITHUB_OWNER_ID", "0"), 10, 64)
	// The dashboard activates from its credentials; there is no feature switch.
	// Validate partial setup rather than quietly ignoring a missing credential.
	c.NewsletterAdminEnabled = c.NewsletterGitHubClientID != "" || c.NewsletterGitHubClientSecret != "" || c.NewsletterGitHubOwnerID != 0 || c.NewsletterOAuthCallbackURL != ""

	if c.SendySenderEmail == "" {
		c.SendySenderEmail = c.SendyAlertTo
	}

	var problems []error
	if c.ContentRevalidationSecret != "" && len(c.ContentRevalidationSecret) < 32 {
		problems = append(problems, errors.New("CONTENT_REVALIDATION_SECRET must contain at least 32 characters"))
	}
	if c.NewsletterAdminEnabled {
		callback, err := url.Parse(c.NewsletterOAuthCallbackURL)
		if c.NewsletterGitHubClientID == "" || c.NewsletterGitHubClientSecret == "" || c.NewsletterGitHubOwnerID < 1 || len(c.RateLimitSecret) < 32 {
			problems = append(problems, errors.New("newsletter dashboard requires GitHub client credentials, owner numeric ID and RATE_LIMIT_SECRET (32+ characters)"))
		}
		if err != nil || callback.Host == "" || callback.User != nil || callback.RawQuery != "" || callback.Fragment != "" || callback.Path != "/admin/newsletters/auth/callback" || (callback.Scheme != "https" && (c.Production() || callback.Scheme != "http")) {
			problems = append(problems, errors.New("NEWSLETTER_OAUTH_CALLBACK_URL must be an API URL ending in /admin/newsletters/auth/callback (HTTPS in production)"))
		}
		if c.NewsletterTestEmail != "" {
			address, err := mail.ParseAddress(c.NewsletterTestEmail)
			if err != nil || address.Address != c.NewsletterTestEmail {
				problems = append(problems, errors.New("NEWSLETTER_TEST_EMAIL must be an email address"))
			}
		}
	}
	publicURL, urlErr := url.Parse(c.SiteURL)
	if urlErr != nil || publicURL == nil || publicURL.Host == "" || publicURL.User != nil || publicURL.RawQuery != "" || publicURL.Fragment != "" || publicURL.Path != "" || (publicURL.Scheme != "https" && (c.Production() || publicURL.Scheme != "http")) {
		problems = append(problems, errors.New("SITE_URL must be an absolute site origin (HTTPS in production)"))
	}
	api, apiErr := url.Parse(c.NewsletterPublicAPIURL)
	if apiErr != nil || api == nil || api.Host == "" || api.User != nil || api.Path != "" || api.RawQuery != "" || api.Fragment != "" || (api.Scheme != "https" && (c.Production() || api.Scheme != "http")) {
		problems = append(problems, errors.New("NEWSLETTER_PUBLIC_API_URL must be the public API origin (HTTPS in production)"))
	}

	if c.SendyAPIKey != "" {
		for _, address := range []struct{ name, value string }{{"SENDY_SENDER_EMAIL", c.SendySenderEmail}, {"SENDY_ALERT_TO_EMAIL", c.SendyAlertTo}} {
			if address.value == "" && address.name == "SENDY_ALERT_TO_EMAIL" {
				continue
			}
			parsed, err := mail.ParseAddress(address.value)
			if err != nil || parsed.Address != address.value {
				problems = append(problems, fmt.Errorf("%s must be an email address", address.name))
			}
		}
		if c.NewsletterEnabled {
			if len(c.RateLimitSecret) < 32 {
				problems = append(problems, errors.New("newsletter email links require RATE_LIMIT_SECRET (32+ characters)"))
			}
		}
	}
	if c.ConversationAlerts != "important" && c.ConversationAlerts != "all" && c.ConversationAlerts != "off" {
		problems = append(problems, errors.New("SENDY_CONVERSATION_ALERTS must be important, all or off"))
	}
	if c.Env != "development" && c.Env != "production" {
		problems = append(problems, fmt.Errorf("APP_ENV must be development or production, got %q", c.Env))
	}
	if c.DatabaseURL == "" {
		problems = append(problems, errors.New("DATABASE_URL is required"))
	}
	if c.RateLimitsEnabled() && len(c.RateLimitSecret) < 32 {
		problems = append(problems, errors.New("RATE_LIMIT_SECRET must contain at least 32 characters"))
	}
	switch c.EmbeddingsProvider {
	case "openai", "tei", "off":
	default:
		problems = append(problems, fmt.Errorf("EMBEDDINGS_PROVIDER must be openai, tei or off, got %q", c.EmbeddingsProvider))
	}
	if c.EmbeddingsProvider == "tei" && c.EmbeddingsURL == "" {
		problems = append(problems, errors.New("EMBEDDINGS_URL is required when EMBEDDINGS_PROVIDER=tei"))
	}
	if c.Production() && len(c.AllowedOrigins) == 0 {
		problems = append(problems, errors.New("ALLOWED_ORIGINS is required in production"))
	}
	return c, errors.Join(problems...)
}

// applyEmbeddingDefaults picks the provider and the matching model settings.
// Explicit EMBEDDING_* variables always win.
func (c *Config) applyEmbeddingDefaults() {
	defaultProvider := "off"
	if c.OpenAIAPIKey != "" {
		defaultProvider = "openai"
	}
	c.EmbeddingsProvider = env("EMBEDDINGS_PROVIDER", defaultProvider)
	model, dims, queryPrefix := "text-embedding-3-small", 1536, ""
	if c.EmbeddingsProvider == "tei" {
		model, dims, queryPrefix = "BAAI/bge-small-en-v1.5", 384, "Represent this sentence for searching relevant passages: "
	}
	c.EmbeddingModel = env("EMBEDDING_MODEL", model)
	c.EmbeddingDimensions = positiveInt(env("EMBEDDING_DIMENSIONS", ""), dims)
	c.EmbeddingQueryPrefix = envRaw("EMBEDDING_QUERY_PREFIX", queryPrefix)
	c.EmbeddingDocumentPrefix = envRaw("EMBEDDING_DOCUMENT_PREFIX", "")
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

// envRaw keeps surrounding spaces, which matter for embedding prefixes.
func envRaw(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
		return value
	}
	return fallback
}

func list(value string) []string {
	var out []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimRight(strings.TrimSpace(item), "/"); item != "" {
			out = append(out, item)
		}
	}
	return out
}

func positiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
