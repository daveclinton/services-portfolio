package askai

import (
	"bytes"
	"context"
	"html/template"
	"net/http"
	"regexp"
	"strings"
	"time"
	_ "time/tzdata" // embed zone data so Africa/Nairobi works on minimal servers

	"github.com/daveclinton/portfolio/backend/internal/brevo"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
)

const consentVersion = "2026-09-22"

// requestContext holds only coarse, non-identifying request details.
type requestContext struct {
	NetworkHash   string
	DeviceType    string
	BrowserFamily string
	OSFamily      string
}

type turnLog struct {
	requestContext
	ConversationID   string
	TurnID           string
	Question         string
	Answer           string
	Status           string // completed | no_evidence | degraded | error
	Intent           string
	IntentSource     string
	IntentConfidence float64
	Model            string
	SourceCount      int
	LatencyMs        int64
	AlertReason      string
}

var (
	botUA     = regexp.MustCompile(`(?i)bot|crawler|spider|slurp`)
	tabletUA  = regexp.MustCompile(`(?i)ipad|tablet`)
	mobileUA  = regexp.MustCompile(`(?i)mobile|android|iphone`)
	browserUA = []struct {
		pattern *regexp.Regexp
		name    string
	}{
		{regexp.MustCompile(`(?i)edg/`), "Edge"},
		{regexp.MustCompile(`(?i)firefox/`), "Firefox"},
		{regexp.MustCompile(`(?i)(?:chrome|crios)/`), "Chrome"},
		{regexp.MustCompile(`(?i)safari/`), "Safari"},
	}
	osUA = []struct {
		pattern *regexp.Regexp
		name    string
	}{
		{regexp.MustCompile(`(?i)android`), "Android"},
		{regexp.MustCompile(`(?i)iphone|ipad|ipod`), "iOS"},
		{regexp.MustCompile(`(?i)windows`), "Windows"},
		{regexp.MustCompile(`(?i)mac os|macintosh`), "macOS"},
		{regexp.MustCompile(`(?i)cros`), "ChromeOS"},
		{regexp.MustCompile(`(?i)linux`), "Linux"},
	}
)

func (s *Service) requestContext(r *http.Request) requestContext {
	ua := r.Header.Get("User-Agent")
	ctx := requestContext{DeviceType: "unknown", BrowserFamily: "Other", OSFamily: "Other"}
	switch {
	case botUA.MatchString(ua):
		ctx.DeviceType = "bot"
	case tabletUA.MatchString(ua):
		ctx.DeviceType = "tablet"
	case mobileUA.MatchString(ua):
		ctx.DeviceType = "mobile"
	case ua != "":
		ctx.DeviceType = "desktop"
	}
	for _, b := range browserUA {
		if b.pattern.MatchString(ua) {
			ctx.BrowserFamily = b.name
			break
		}
	}
	for _, o := range osUA {
		if o.pattern.MatchString(ua) {
			ctx.OSFamily = o.name
			break
		}
	}
	// The hash rotates daily, so turns can't be linked across days by network.
	day := time.Now().UTC().Format("2006-01-02")
	ip := httpx.ClientIP(r, s.cfg.TrustProxyHeaders)
	ctx.NetworkHash = s.privacy.Hash("conversation-network:" + day + ":" + ip)
	return ctx
}

func (s *Service) logTurn(ctx context.Context, e turnLog) error {
	_, err := s.db.Exec(ctx, `
		WITH conversation AS (
		  INSERT INTO knowledge_aiconversation
		    (id, network_hash, device_type, browser_family, os_family,
		     consent_version, consented_at, created_at, updated_at, expires_at)
		  VALUES ($1::text::uuid, $2, $3, $4, $5, $6, NOW(), NOW(), NOW(),
		          NOW() + ($7::integer * INTERVAL '1 day'))
		  ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
		  RETURNING id
		)
		INSERT INTO knowledge_aiconversationturn
		  (id, conversation_id, question, answer, status, intent, intent_source,
		   intent_confidence, model, source_count, latency_ms, created_at)
		SELECT $8::text::uuid, id, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
		  FROM conversation
		ON CONFLICT (id) DO NOTHING`,
		e.ConversationID, e.NetworkHash, e.DeviceType, e.BrowserFamily, e.OSFamily,
		consentVersion, s.cfg.ConversationRetentionDays,
		e.TurnID, e.Question, e.Answer, e.Status, e.Intent, e.IntentSource,
		e.IntentConfidence, e.Model, e.SourceCount, e.LatencyMs)
	return err
}

// claimAlert marks a conversation as alerted; only the first caller wins, so
// each chat session sends at most one email.
func (s *Service) claimAlert(ctx context.Context, conversationID string) (bool, error) {
	tag, err := s.db.Exec(ctx, `
		UPDATE knowledge_aiconversation SET alerted_at = NOW()
		 WHERE id = $1::text::uuid AND alerted_at IS NULL`, conversationID)
	return tag.RowsAffected() == 1, err
}

func (s *Service) releaseAlert(ctx context.Context, conversationID string) error {
	_, err := s.db.Exec(ctx, "UPDATE knowledge_aiconversation SET alerted_at = NULL WHERE id = $1::text::uuid", conversationID)
	return err
}

func (s *Service) purgeExpired(ctx context.Context) (int64, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	// Lock parents before removing children so a concurrent turn cannot be
	// inserted between the two deletes. NOW() is stable within the transaction.
	if _, err := tx.Exec(ctx, "SELECT id FROM knowledge_aiconversation WHERE expires_at <= NOW() FOR UPDATE"); err != nil {
		return 0, err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM knowledge_aiconversationturn AS turn
		USING knowledge_aiconversation AS conversation
		WHERE turn.conversation_id = conversation.id AND conversation.expires_at <= NOW()`); err != nil {
		return 0, err
	}
	tag, err := tx.Exec(ctx, "DELETE FROM knowledge_aiconversation WHERE expires_at <= NOW()")
	if err != nil {
		return 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// storeAndAlert runs after the response: it stores the turn, then sends the
// once-per-session email. Failures are logged and never reach the visitor.
func (s *Service) storeAndAlert(ctx context.Context, e turnLog) {
	if err := s.logTurn(ctx, e); err != nil {
		s.log.Error("store conversation turn", "err", err)
		return
	}
	if s.mail == nil || !shouldNotifyConversation(s.cfg.ConversationAlerts, e) {
		return
	}
	claimed, err := s.claimAlert(ctx, e.ConversationID)
	if err != nil || !claimed {
		if err != nil {
			s.log.Error("claim conversation alert", "err", err)
		}
		return
	}
	if err := s.sendAlert(ctx, e); err != nil {
		s.log.Error("send conversation alert", "err", err)
		if err := s.releaseAlert(ctx, e.ConversationID); err != nil {
			s.log.Error("release conversation alert claim", "err", err)
		}
	}
}

var alertTemplate = template.Must(template.New("alert").Funcs(template.FuncMap{
	"paragraph": func(value string) template.HTML {
		if value == "" {
			value = "(no response was generated)"
		}
		escaped := template.HTMLEscapeString(value)
		return template.HTML(strings.ReplaceAll(escaped, "\n", "<br>"))
	},
	"percent": func(v float64) int { return int(v*100 + 0.5) },
}).Parse(`<!doctype html>
<html>
  <body style="margin:0;background:#f5f3ef;color:#171717;font-family:Arial,sans-serif">
    <main style="max-width:680px;margin:0 auto;padding:32px 20px">
      <section style="background:#fff;border:1px solid #dedbd5;border-radius:14px;padding:28px">
        <p style="margin:0 0 8px;color:#6b665e;font-size:13px">ASK AI SESSION ALERT</p>
        <h1 style="margin:0 0 12px;font-size:24px">A conversation needs your attention</h1>
        <p style="margin:0 0 24px;color:#6b665e;line-height:1.5">A successful conversation matched your notification policy. This is the qualifying turn, which may follow earlier browsing. Later turns remain available in the stored conversation.</p>
        <p style="margin:0 0 8px"><strong>Qualifying question</strong></p>
        <p style="margin:0 0 24px;line-height:1.6">{{paragraph .Turn.Question}}</p>
        <p style="margin:0 0 8px"><strong>Assistant response</strong></p>
        <p style="margin:0 0 24px;line-height:1.6">{{paragraph .Turn.Answer}}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;color:#4d4943">
          <tr><td style="padding:6px 0"><strong>Status</strong></td><td>{{.Turn.Status}}</td></tr>
          <tr><td style="padding:6px 0"><strong>Intent</strong></td><td>{{.Turn.Intent}} ({{.Turn.IntentSource}}, {{percent .Turn.IntentConfidence}}%)</td></tr>
          <tr><td style="padding:6px 0"><strong>Sources</strong></td><td>{{.Turn.SourceCount}}</td></tr>
          <tr><td style="padding:6px 0"><strong>Device</strong></td><td>{{.Turn.DeviceType}} · {{.Turn.BrowserFamily}} · {{.Turn.OSFamily}}</td></tr>
          <tr><td style="padding:6px 0"><strong>Latency</strong></td><td>{{.Turn.LatencyMs}} ms</td></tr>
          <tr><td style="padding:6px 0"><strong>Time</strong></td><td>{{.Time}}</td></tr>
          <tr><td style="padding:6px 0"><strong>Conversation</strong></td><td>{{.Turn.ConversationID}}</td></tr>
        </table>
        <p style="margin:24px 0 0;color:#6b665e;font-size:12px">Stored for {{.RetentionDays}} days under the visitor's explicit consent. Raw IP addresses are not included.</p>
      </section>
    </main>
  </body>
</html>`))

func (s *Service) sendAlert(ctx context.Context, e turnLog) error {
	location, err := time.LoadLocation("Africa/Nairobi")
	if err != nil {
		location = time.UTC
	}
	var body bytes.Buffer
	if err := alertTemplate.Execute(&body, map[string]any{
		"Turn":          e,
		"Time":          time.Now().In(location).Format("2 Jan 2006, 15:04:05 MST"),
		"RetentionDays": s.cfg.ConversationRetentionDays,
	}); err != nil {
		return err
	}
	intent := firstNonEmpty(e.AlertReason, e.Intent, "general")
	return s.sendMail(ctx, "Ask AI: visitor interest · "+intent, body.String(), e.ConversationID)
}

func (s *Service) sendMail(ctx context.Context, subject, body, key string) error {
	return s.mail.Send(ctx, brevo.Email{
		Sender:         brevo.Address{Name: s.cfg.BrevoSenderName, Email: s.cfg.BrevoSenderEmail},
		To:             []brevo.Address{{Name: "David Clinton", Email: s.cfg.BrevoAlertTo}},
		Subject:        subject,
		HTML:           body,
		IdempotencyKey: key,
	})
}

func shouldNotifyConversation(mode string, e turnLog) bool {
	if mode == "off" || e.Status != "completed" || e.DeviceType == "bot" {
		return false
	}
	if mode == "all" {
		return true
	}
	return e.AlertReason == "hiring" || e.AlertReason == "pricing" || e.AlertReason == "contact"
}

var hiringInterest = regexp.MustCompile(`\b(hire|hiring|work with|job description|role requirements|available for|availability)\b`)
var contactInterest = regexp.MustCompile(`\b(contact|email|reach (him|david)|get in touch)\b`)

func opportunityReason(question, workflow string, decision intentDecision) string {
	if decision.PolicyOverride {
		return ""
	}
	if workflow == "role_fit" || workflow == "interview" || decision.Plan.Goal == "evaluate_fit" {
		return "hiring"
	}
	if decision.Plan.Goal == "pricing" || decision.Intent.Name == "rates" {
		return "pricing"
	}
	if decision.Plan.Goal == "contact" || contactInterest.MatchString(normalize(question)) {
		return "contact"
	}
	if hiringInterest.MatchString(normalize(question)) {
		return "hiring"
	}
	return ""
}
