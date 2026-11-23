package askai

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Uses an isolated schema in an explicitly supplied test database. No OpenAI,
// embeddings or email integrations are used by this regression test.
func TestConversationRetentionWithForeignKeys(t *testing.T) {
	url := os.Getenv("ASKAI_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("set ASKAI_TEST_DATABASE_URL to run the Postgres retention regression")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	schema := pgx.Identifier{"askai_test_" + strings.ReplaceAll(httpx.NewUUID(), "-", "")}.Sanitize()
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+schema); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := admin.Exec(context.Background(), "DROP SCHEMA "+schema+" CASCADE"); err != nil {
			t.Error(err)
		}
	}()
	poolConfig, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	poolConfig.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()
	_, err = pool.Exec(ctx, `
		CREATE TABLE knowledge_aiconversation (
		  id uuid PRIMARY KEY, network_hash text, device_type text, browser_family text, os_family text,
		  consent_version text, consented_at timestamptz, created_at timestamptz, updated_at timestamptz, expires_at timestamptz, alerted_at timestamptz
		);
		CREATE TABLE knowledge_aiconversationturn (
		  id uuid PRIMARY KEY, conversation_id uuid REFERENCES knowledge_aiconversation(id) DEFERRABLE INITIALLY DEFERRED,
		  question text, answer text, status text, intent text, intent_source text, intent_confidence float8,
		  model text, source_count integer, latency_ms bigint, created_at timestamptz
		);`)
	if err != nil {
		t.Fatal(err)
	}
	service := &Service{db: pool, cfg: config.Config{ConversationRetentionDays: 30}, log: slog.Default()}
	expiredID := httpx.NewUUID()
	for _, id := range []string{expiredID, httpx.NewUUID()} {
		if err := service.logTurn(ctx, turnLog{ConversationID: id, TurnID: httpx.NewUUID(), Question: "Question", Answer: "Answer", Status: "completed"}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := pool.Exec(ctx, "UPDATE knowledge_aiconversation SET expires_at = NOW() - INTERVAL '1 day' WHERE id=$1::text::uuid", expiredID); err != nil {
		t.Fatal(err)
	}
	// This used to fail: every new turn tried to delete all expired parents.
	if err := service.logTurn(ctx, turnLog{ConversationID: httpx.NewUUID(), TurnID: httpx.NewUUID(), Question: "New question", Status: "error"}); err != nil {
		t.Fatalf("expired data blocked a new turn: %v", err)
	}
	deleted, err := service.purgeExpired(ctx)
	if err != nil || deleted != 1 {
		t.Fatalf("purge deleted=%d err=%v", deleted, err)
	}
	var parents, turns int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM knowledge_aiconversation").Scan(&parents); err != nil {
		t.Fatal(err)
	}
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM knowledge_aiconversationturn").Scan(&turns); err != nil {
		t.Fatal(err)
	}
	if parents != 2 || turns != 2 {
		t.Fatalf("retained parents=%d turns=%d; want 2 each", parents, turns)
	}
	if deleted, err := service.purgeExpired(ctx); err != nil || deleted != 0 {
		t.Fatalf("repeat purge deleted=%d err=%v", deleted, err)
	}
	// A greeting must not consume the durable one-notification claim. A later
	// qualified turn sends exactly one email through the fake sender.
	mail := &recordingMailer{}
	service.mail = mail
	service.cfg.ConversationAlerts = "important"
	conversationID := httpx.NewUUID()
	service.storeAndAlert(ctx, turnLog{ConversationID: conversationID, TurnID: httpx.NewUUID(), Question: "Hello", Answer: "Hello", Status: "completed"})
	if len(mail.messages) != 0 {
		t.Fatal("greeting triggered an email")
	}
	service.storeAndAlert(ctx, turnLog{ConversationID: conversationID, TurnID: httpx.NewUUID(), Question: "Can I hire David?", Answer: "Published work", Status: "completed", AlertReason: "hiring"})
	service.storeAndAlert(ctx, turnLog{ConversationID: conversationID, TurnID: httpx.NewUUID(), Question: "How much?", Answer: "Published rate", Status: "completed", AlertReason: "pricing"})
	if len(mail.messages) != 1 {
		t.Fatalf("sent %d qualified notices, want 1", len(mail.messages))
	}
}
