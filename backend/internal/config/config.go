// Package config reads every setting the API needs from environment variables
// once at startup, validates them, and fails fast when production is misconfigured.
package config

import (
	"errors"
	"fmt"
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

	BrevoAPIKey      string
	BrevoAlertTo     string
	BrevoSenderEmail string
	BrevoSenderName  string

	ConversationRetentionDays int
}

func (c Config) Production() bool { return c.Env == "production" }

// RateLimitsEnabled is false only in development when no secret is configured,
// so local work doesn't need any setup. Production always enforces limits.
func (c Config) RateLimitsEnabled() bool {
	return c.Production() || c.RateLimitSecret != ""
}

func (c Config) AlertsEnabled() bool {
	return c.BrevoAPIKey != "" && c.BrevoAlertTo != ""
}

func Load() (Config, error) {
	c := Config{
		Env:               env("APP_ENV", "development"),
		Addr:              env("ADDR", "127.0.0.1:8080"),
		DatabaseURL:       env("DATABASE_URL", ""),
		AllowedOrigins:    list(env("ALLOWED_ORIGINS", "http://localhost:3000")),
		TrustProxyHeaders: boolean(env("TRUST_PROXY_HEADERS", "true")),

		RateLimitSecret:        env("RATE_LIMIT_SECRET", ""),
		AIGlobalDailyLimit:     positiveInt(env("AI_GLOBAL_DAILY_LIMIT", ""), 200),
		SearchGlobalDailyLimit: positiveInt(env("SEARCH_GLOBAL_DAILY_LIMIT", ""), 2000),

		OpenAIAPIKey:      env("OPENAI_API_KEY", ""),
		OpenAIChatModel:   env("OPENAI_CHAT_MODEL", "gpt-4.1-mini"),
		OpenAIIntentModel: env("OPENAI_INTENT_MODEL", "gpt-4o-mini"),

		EmbeddingsURL: env("EMBEDDINGS_URL", ""),

		BrevoAPIKey:      env("BREVO_API_KEY", ""),
		BrevoAlertTo:     env("BREVO_ALERT_TO_EMAIL", ""),
		BrevoSenderEmail: env("BREVO_SENDER_EMAIL", ""),
		BrevoSenderName:  env("BREVO_SENDER_NAME", "David Clinton Portfolio"),

		ConversationRetentionDays: positiveInt(env("CONVERSATION_RETENTION_DAYS", ""), 30),
	}
	c.applyEmbeddingDefaults()
	if c.BrevoSenderEmail == "" {
		c.BrevoSenderEmail = c.BrevoAlertTo
	}

	var problems []error
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

func boolean(value string) bool {
	parsed, err := strconv.ParseBool(value)
	return err == nil && parsed
}

func positiveInt(value string, fallback int) int {
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}
