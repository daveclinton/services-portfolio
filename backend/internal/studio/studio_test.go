package studio

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
)

type fakeCampaigns struct {
	campaign                       sendy.Campaign
	creates, tests, sends, updates int
	body, testEmail                string
	createTimeout, sendTimeout     bool
	sendError                      error
	recipients                     []string
	recipientCalls                 int
}

func (p *fakeCampaigns) CreateCampaign(_ context.Context, name, subject, body string, sender sendy.Address, list int64) (int64, error) {
	p.creates++
	p.campaign.ID = 41
	p.campaign.Name = name
	p.campaign.Status = "draft"
	p.campaign.Recipients.ListIDs = []int64{list}
	p.body = body
	if p.createTimeout {
		return 0, errors.New("lost creation response")
	}
	return 41, nil
}
func (p *fakeCampaigns) UpdateCampaign(_ context.Context, id int64, payload map[string]any) error {
	p.updates++
	if html, ok := payload["htmlContent"].(string); ok {
		p.body = html
	}
	if value, ok := payload["scheduledAt"].(string); ok {
		when, _ := time.Parse(time.RFC3339, value)
		p.campaign.ScheduledAt = &when
		p.campaign.Status = "queued"
	}
	return nil
}
func (p *fakeCampaigns) GetCampaign(context.Context, int64) (sendy.Campaign, error) {
	return p.campaign, nil
}
func (p *fakeCampaigns) FindCampaign(context.Context, string) (sendy.Campaign, error) {
	return p.campaign, nil
}
func (p *fakeCampaigns) SendTestCampaign(_ context.Context, _ int64, email string) error {
	p.tests++
	p.testEmail = email
	return nil
}
func (p *fakeCampaigns) SendCampaign(context.Context, int64) error {
	p.sends++
	if p.sendError != nil {
		return p.sendError
	}
	p.campaign.Status = "queued"
	if p.sendTimeout {
		return errors.New("lost send response")
	}
	return nil
}
func (p *fakeCampaigns) SetCampaignStatus(_ context.Context, _ int64, status string) error {
	p.campaign.Status = status
	p.campaign.ScheduledAt = nil
	return nil
}
func (p *fakeCampaigns) SetCampaignRecipients(_ context.Context, _ int64, emails []string) error {
	p.recipients = append([]string(nil), emails...)
	p.recipientCalls++
	return nil
}
func (p *fakeCampaigns) CampaignAudience(context.Context, int64) (int, error) { return 3, nil }

type fixture struct {
	s           *Service
	mail        *fakeCampaigns
	handler     http.Handler
	token, csrf string
}

func newFixture(t testing.TB) *fixture {
	t.Helper()
	dsn := os.Getenv("NEWSLETTER_STUDIO_TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("set NEWSLETTER_STUDIO_TEST_DATABASE_URL for isolated PostgreSQL studio tests")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	schemaName := "studio_test_" + strings.ReplaceAll(httpx.NewUUID(), "-", "")
	quoted := pgx.Identifier{schemaName}.Sanitize()
	if _, err = admin.Exec(ctx, "CREATE SCHEMA "+quoted); err != nil {
		admin.Close()
		t.Fatal(err)
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxConns = 4
	cfg.ConnConfig.RuntimeParams["search_path"] = schemaName
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		pool.Close()
		_, err := admin.Exec(context.Background(), "DROP SCHEMA "+quoted+" CASCADE")
		if err != nil {
			t.Error(err)
		}
		admin.Close()
	})
	s := New(config.Config{NewsletterAdminEnabled: true, NewsletterGitHubOwnerID: 42, SiteURL: "https://portfolio.test", RateLimitSecret: strings.Repeat("x", 40), SendyAPIKey: "fake", SendySenderName: "David", SendySenderEmail: "david@example.com", NewsletterTestEmail: "owner@example.com"}, pool, slog.New(slog.NewTextHandler(io.Discard, nil)), func() (sendy.NewsletterIDs, bool) { return sendy.NewsletterIDs{ListID: 2}, true })
	if err = s.Init(ctx); err != nil {
		t.Fatal(err)
	}
	mail := &fakeCampaigns{}
	s.mail = mail
	token := randomToken()
	_, err = pool.Exec(ctx, `INSERT INTO newsletter_studio_sessions(token_hash,github_id,login,expires_at) VALUES($1,42,'owner',NOW()+INTERVAL '1 hour')`, s.privacy.Hash("studio-session:"+token))
	if err != nil {
		t.Fatal(err)
	}
	mux := http.NewServeMux()
	s.Routes(mux)
	return &fixture{s: s, mail: mail, handler: mux, token: token, csrf: s.privacy.Hash("studio-csrf:" + token)}
}
func (f *fixture) request(method, path string, body any) *httptest.ResponseRecorder {
	var reader io.Reader
	if body != nil {
		data, _ := json.Marshal(body)
		reader = strings.NewReader(string(data))
	}
	r := httptest.NewRequest(method, path, reader)
	r.AddCookie(f.s.cookie(f.s.ownerCookie(), f.token, 3600))
	r.Header.Set("Origin", f.s.cfg.SiteURL)
	if method != "GET" {
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("X-CSRF-Token", f.csrf)
	}
	w := httptest.NewRecorder()
	f.handler.ServeHTTP(w, r)
	return w
}
func decodeDraft(t *testing.T, w *httptest.ResponseRecorder) Draft {
	t.Helper()
	if w.Code != 200 && w.Code != 201 {
		t.Fatalf("request failed: %d %s", w.Code, w.Body)
	}
	var d Draft
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	return d
}
func (f *fixture) draft(t *testing.T) Draft {
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "A personal note"}))
	return decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+d.ID+"/save", map[string]any{"subject": d.Subject, "markdown": "Hello **reader**. [My work](/blog)", "revision": d.Revision}))
}
func (f *fixture) action(t *testing.T, d Draft, action string, extra map[string]any) *httptest.ResponseRecorder {
	t.Helper()
	if extra == nil {
		extra = map[string]any{}
	}
	extra["revision"] = d.Revision
	return f.request("POST", "/admin/newsletters/drafts/"+d.ID+"/"+action, extra)
}

func TestDisabledStudioNeverTreatsVisitorCookieAsOwner(t *testing.T) {
	s := New(config.Config{}, nil, slog.Default(), nil)
	mux := http.NewServeMux()
	s.Routes(mux)
	for _, path := range []string{"/admin/newsletters/meta", "/admin/newsletters/drafts"} {
		r := httptest.NewRequest("GET", path, nil)
		r.AddCookie(s.privacy.Cookie(httpx.NewUUID(), false))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != 401 {
			t.Fatalf("disabled route opened: %d", w.Code)
		}
	}
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest("GET", "/admin/newsletters/session", nil))
	if strings.Contains(w.Body.String(), `true`) {
		t.Fatal("disabled dashboard claimed authentication")
	}
}

func TestOwnerAuthorizationOriginCSRFAndLogout(t *testing.T) {
	f := newFixture(t)
	w := f.request("GET", "/admin/newsletters/session", nil)
	if w.Code != 200 || !strings.Contains(w.Body.String(), f.csrf) {
		t.Fatal("owner session not recognized")
	}
	for _, tc := range []struct{ origin, csrf string }{{f.s.cfg.SiteURL, "wrong"}, {"", f.csrf}, {"https://other.test", f.csrf}} {
		r := httptest.NewRequest("POST", "/admin/newsletters/drafts", strings.NewReader(`{"subject":"test"}`))
		r.AddCookie(f.s.cookie(f.s.ownerCookie(), f.token, 3600))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Origin", tc.origin)
		r.Header.Set("X-CSRF-Token", tc.csrf)
		w := httptest.NewRecorder()
		f.handler.ServeHTTP(w, r)
		if w.Code != 403 {
			t.Fatalf("CSRF/origin bypass: %d", w.Code)
		}
	}
	if w = f.request("POST", "/admin/newsletters/logout", map[string]any{}); w.Code != 200 {
		t.Fatal(w.Code)
	}
	if w = f.request("GET", "/admin/newsletters/drafts", nil); w.Code != 401 {
		t.Fatal("revoked session remained valid")
	}
	_, err := f.s.db.Exec(context.Background(), `INSERT INTO newsletter_studio_sessions(token_hash,github_id,login,expires_at) VALUES($1,43,'owner',NOW()+INTERVAL '1 hour')`, f.s.privacy.Hash("studio-session:"+f.token))
	if err != nil {
		t.Fatal(err)
	}
	if w = f.request("GET", "/admin/newsletters/drafts", nil); w.Code != 401 {
		t.Fatal("matching login name bypassed owner numeric ID")
	}
}

func TestSessionsSlideWithUseUpToTheirLifetime(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	hash := f.s.privacy.Hash("studio-session:" + f.token)
	expiry := func() time.Duration {
		var left time.Duration
		if err := f.s.db.QueryRow(ctx, `SELECT EXTRACT(EPOCH FROM expires_at-NOW())::bigint * INTERVAL '1 second' FROM newsletter_studio_sessions WHERE token_hash=$1`, hash).Scan(&left); err != nil {
			t.Fatal(err)
		}
		return left
	}
	// Used within the last day: nothing is written.
	if _, err := f.s.db.Exec(ctx, `UPDATE newsletter_studio_sessions SET expires_at=NOW()+INTERVAL '29 days 12 hours', created_at=NOW() WHERE token_hash=$1`, hash); err != nil {
		t.Fatal(err)
	}
	f.request("GET", "/admin/newsletters/session", nil)
	if left := expiry(); left > 29*24*time.Hour+13*time.Hour {
		t.Fatal("renewed more than once a day", left)
	}
	// Idle for days: a visit pushes expiry back out to the idle window.
	if _, err := f.s.db.Exec(ctx, `UPDATE newsletter_studio_sessions SET expires_at=NOW()+INTERVAL '2 days' WHERE token_hash=$1`, hash); err != nil {
		t.Fatal(err)
	}
	if w := f.request("GET", "/admin/newsletters/session", nil); !strings.Contains(w.Body.String(), `"authenticated":true`) {
		t.Fatal("live session not recognized")
	}
	if left := expiry(); left < sessionIdle-time.Minute {
		t.Fatal("used session was not extended", left)
	}
	// Near the lifetime cap: use cannot push expiry past it.
	if _, err := f.s.db.Exec(ctx, `UPDATE newsletter_studio_sessions SET created_at=NOW()-INTERVAL '89 days', expires_at=NOW()+INTERVAL '2 hours' WHERE token_hash=$1`, hash); err != nil {
		t.Fatal(err)
	}
	f.request("GET", "/admin/newsletters/session", nil)
	if left := expiry(); left > 24*time.Hour+time.Minute || left < 23*time.Hour {
		t.Fatal("session outlived its lifetime cap", left)
	}
	// Expired: not recognized, and not revived.
	if _, err := f.s.db.Exec(ctx, `UPDATE newsletter_studio_sessions SET expires_at=NOW()-INTERVAL '1 second' WHERE token_hash=$1`, hash); err != nil {
		t.Fatal(err)
	}
	if w := f.request("GET", "/admin/newsletters/session", nil); !strings.Contains(w.Body.String(), `"authenticated":false`) || expiry() > 0 {
		t.Fatal("expired session came back")
	}
}

func TestLogoutAlwaysSignsTheBrowserOut(t *testing.T) {
	f := newFixture(t)
	cleared := func(w *httptest.ResponseRecorder) bool {
		for _, c := range w.Result().Cookies() {
			if c.Name == f.s.ownerCookie() && c.MaxAge < 0 {
				return true
			}
		}
		return false
	}
	if _, err := f.s.db.Exec(context.Background(), `UPDATE newsletter_studio_sessions SET expires_at=NOW()-INTERVAL '1 second'`); err != nil {
		t.Fatal(err)
	}
	if w := f.request("POST", "/admin/newsletters/logout", map[string]any{}); w.Code != 200 || !cleared(w) {
		t.Fatal("expired session could not sign out", w.Code)
	}
	for _, origin := range []string{f.s.cfg.SiteURL, "https://other.test"} {
		r := httptest.NewRequest("POST", "/admin/newsletters/logout", strings.NewReader(`{}`))
		r.Header.Set("Origin", origin)
		w := httptest.NewRecorder()
		f.handler.ServeHTTP(w, r)
		if want := map[bool]int{true: 200, false: 403}[origin == f.s.cfg.SiteURL]; w.Code != want {
			t.Fatalf("logout from %s without a cookie: %d", origin, w.Code)
		}
	}
}

func TestGitHubLoginUsesPKCEOneTimeStateAndOwnerID(t *testing.T) {
	f := newFixture(t)
	exchanges := 0
	identity := int64(42)
	provider := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.URL.Path == "/token" {
			exchanges++
			_ = r.ParseForm()
			if r.Form.Get("code_verifier") == "" {
				t.Error("missing PKCE verifier")
			}
			_, _ = io.WriteString(w, `{"access_token":"test-token","token_type":"bearer"}`)
			return
		}
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Error("missing token")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"id": identity, "login": "renamed-owner"})
	}))
	defer provider.Close()
	f.s.oauth = oauth2.Config{ClientID: "client", ClientSecret: "secret", RedirectURL: "https://api.test/admin/newsletters/auth/callback", Endpoint: oauth2.Endpoint{AuthURL: "https://github.test/authorize", TokenURL: provider.URL + "/token", AuthStyle: oauth2.AuthStyleInParams}}
	f.s.identityURL = provider.URL + "/user"
	login := func() (*http.Cookie, string) {
		w := httptest.NewRecorder()
		f.s.login(w, httptest.NewRequest("GET", "/admin/newsletters/auth/login?next="+url.QueryEscape("/admin/newsletters?doc=abc&view=preview"), nil))
		target, _ := url.Parse(w.Header().Get("Location"))
		if target.Query().Get("code_challenge_method") != "S256" || target.Query().Get("code_challenge") == "" {
			t.Fatal("PKCE challenge missing")
		}
		return w.Result().Cookies()[0], target.Query().Get("state")
	}
	callback := func(cookie *http.Cookie, state string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/admin/newsletters/auth/callback?code=code&state="+state, nil)
		r.AddCookie(cookie)
		w := httptest.NewRecorder()
		f.s.callback(w, r)
		return w
	}
	cookie, state := login()
	w := callback(cookie, "wrong")
	if exchanges != 0 || !strings.Contains(w.Header().Get("Location"), "failed") {
		t.Fatal("bad OAuth state accepted")
	}
	w = callback(cookie, state)
	authenticated := false
	for _, c := range w.Result().Cookies() {
		if c.Name == f.s.ownerCookie() && c.Value != "" {
			authenticated = true
			if !c.HttpOnly || c.MaxAge != int(sessionLifetime.Seconds()) {
				t.Fatal("weak session cookie")
			}
		}
	}
	if !authenticated {
		t.Fatal("owner identity denied", w.Header())
	}
	if w.Header().Get("Location") != f.s.cfg.SiteURL+"/admin/newsletters?doc=abc&view=preview" {
		t.Fatal("sign-in did not return to the page the owner wanted", w.Header().Get("Location"))
	}
	_ = callback(cookie, state)
	if exchanges != 1 {
		t.Fatal("OAuth state was reusable")
	}
	identity = 43
	cookie, state = login()
	w = callback(cookie, state)
	if want := f.s.cfg.SiteURL + "/admin/signin?login=failed&next=" + url.QueryEscape("/admin/newsletters?doc=abc&view=preview"); w.Header().Get("Location") != want {
		t.Fatal("another GitHub account became owner, or lost the return page", w.Header().Get("Location"))
	}
}

func TestDraftPersistenceRevisionConflictAndCanonicalPreview(t *testing.T) {
	f := newFixture(t)
	d := f.draft(t)
	w := f.request("POST", "/admin/newsletters/drafts/"+d.ID+"/save", map[string]any{"subject": "Old tab", "markdown": "overwritten", "revision": 1})
	if w.Code != 409 {
		t.Fatal("stale save overwrote content")
	}
	other := New(f.s.cfg, f.s.db, f.s.log, f.s.listIDs)
	if err := other.Init(context.Background()); err != nil {
		t.Fatal(err)
	}
	persisted, err := other.getDraft(context.Background(), d.ID)
	if err != nil || persisted.Markdown != d.Markdown || persisted.Revision != 2 {
		t.Fatal("draft not durable", err)
	}
	w = f.action(t, d, "preview", nil)
	var preview struct {
		HTML string `json:"html"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &preview)
	expected, err := sendy.RenderNewsletter(d.Subject, d.Markdown, f.s.cfg.SiteURL)
	if err != nil || w.Code != 200 || preview.HTML != expected {
		t.Fatal("preview differs from canonical email")
	}
	if w = f.action(t, d, "test", nil); w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	if f.mail.body != expected || f.mail.tests != 1 || f.mail.testEmail != "owner@example.com" || f.mail.sends != 0 {
		t.Fatal("test used different content or recipients")
	}
}

func TestBroadcastIsSubmittedOnceAndNeverReportedSentBeforeProvider(t *testing.T) {
	f := newFixture(t)
	d := f.draft(t)
	d = decodeDraft(t, f.action(t, d, "send", nil))
	if d.State != "sending" || f.mail.sends != 1 {
		t.Fatal("send result claimed wrong status")
	}
	if w := f.action(t, d, "send", nil); w.Code != 409 || f.mail.sends != 1 {
		t.Fatal("duplicate broadcast was allowed")
	}
	f.mail.campaign.Status = "sent"
	d = decodeDraft(t, f.action(t, d, "refresh", nil))
	if d.State != "sent" {
		t.Fatal("provider sent state missing")
	}
	if f.mail.creates != 1 || len(f.mail.campaign.Recipients.ListIDs) != 1 || f.mail.campaign.Recipients.ListIDs[0] != 2 {
		t.Fatal("campaign audience changed")
	}
}

func TestSchedulePersistsAndCancellationIsVerified(t *testing.T) {
	f := newFixture(t)
	d := f.draft(t)
	when := time.Now().UTC().Add(2 * time.Hour).Truncate(time.Second)
	d = decodeDraft(t, f.action(t, d, "schedule", map[string]any{"scheduled_at": when.Format(time.RFC3339)}))
	if d.State != "scheduled" || d.ScheduledAt == nil || !d.ScheduledAt.Equal(when) || f.mail.sends != 0 {
		t.Fatal("schedule was not stored correctly")
	}
	if w := f.request("POST", "/admin/newsletters/drafts/"+d.ID+"/save", map[string]any{"subject": d.Subject, "markdown": "changed", "revision": d.Revision}); w.Code != 409 {
		t.Fatal("scheduled content could be edited")
	}
	d = decodeDraft(t, f.action(t, d, "cancel", nil))
	if d.State != "draft" || d.ScheduledAt != nil || f.mail.campaign.Status != "draft" {
		t.Fatal("cancellation was not verified")
	}
}

func TestLostSendResponseSurvivesRestartAndReconcilesWithoutResend(t *testing.T) {
	f := newFixture(t)
	f.mail.sendTimeout = true
	d := f.draft(t)
	d = decodeDraft(t, f.action(t, d, "send", nil))
	if d.State != "checking" || f.mail.sends != 1 {
		t.Fatal("unknown send result was treated as failed/sent")
	}
	if w := f.action(t, d, "send", nil); w.Code != 409 || f.mail.sends != 1 {
		t.Fatal("ambiguous send was retried")
	}
	other := New(f.s.cfg, f.s.db, f.s.log, f.s.listIDs)
	other.mail = f.mail
	mux := http.NewServeMux()
	other.Routes(mux)
	f.handler = mux
	// A delayed provider read can still show a draft after a lost send response.
	// That is not evidence that retrying the broadcast is safe.
	f.mail.campaign.Status = "draft"
	d = decodeDraft(t, f.action(t, d, "refresh", nil))
	if d.State != "checking" || f.action(t, d, "send", nil).Code != 409 || f.mail.sends != 1 {
		t.Fatal("stale provider status enabled another broadcast")
	}
	f.mail.campaign.Status = "queued"
	d = decodeDraft(t, f.action(t, d, "refresh", nil))
	if d.State != "sending" || f.mail.sends != 1 {
		t.Fatal("restart lost operation recovery")
	}
}

func TestDraftSaveAndDeliveryShareTheSameLock(t *testing.T) {
	f := newFixture(t)
	d := f.draft(t)
	conn, err := f.s.db.Acquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Release()
	if _, err = conn.Exec(context.Background(), `SELECT pg_advisory_lock(hashtextextended($1,0))`, d.ID); err != nil {
		t.Fatal(err)
	}
	defer func() {
		_, _ = conn.Exec(context.Background(), `SELECT pg_advisory_unlock(hashtextextended($1,0))`, d.ID)
	}()
	if w := f.request("POST", "/admin/newsletters/drafts/"+d.ID+"/save", map[string]any{"subject": d.Subject, "markdown": "Concurrent change", "revision": d.Revision}); w.Code != 409 {
		t.Fatalf("save ignored delivery lock: %d", w.Code)
	}
	if w := f.action(t, d, "send", nil); w.Code != 409 || f.mail.creates != 0 || f.mail.sends != 0 {
		t.Fatal("delivery ignored another owner action")
	}
	stored, err := f.s.getDraft(context.Background(), d.ID)
	if err != nil || stored.Revision != d.Revision || stored.Markdown != d.Markdown {
		t.Fatal("locked draft changed")
	}
}

func TestLostCreationResponseRecoversExistingProviderDraft(t *testing.T) {
	f := newFixture(t)
	f.mail.createTimeout = true
	d := f.draft(t)
	d = decodeDraft(t, f.action(t, d, "test", nil))
	if d.State != "checking" || d.CampaignID != 0 {
		t.Fatal("ambiguous creation was not retained")
	}
	d = decodeDraft(t, f.action(t, d, "refresh", nil))
	if d.State != "draft" || d.CampaignID != 41 {
		t.Fatal("provider draft was not recovered")
	}
	d = decodeDraft(t, f.action(t, d, "test", nil))
	if d.State != "draft" || f.mail.creates != 1 || f.mail.tests != 1 {
		t.Fatal("recovery created or sent another campaign")
	}
}

func TestProviderRefusalDoesNotClaimSuccessfulDelivery(t *testing.T) {
	f := newFixture(t)
	f.mail.sendError = &sendy.APIError{Status: 402, Code: "not_enough_credits"}
	d := f.draft(t)
	d = decodeDraft(t, f.action(t, d, "send", nil))
	if d.State != "error" || !strings.Contains(d.LastError, "credits") {
		t.Fatal("provider refusal hidden", d)
	}
}

func TestLegacyProviderCampaignIDCannotOperateOnLocalCampaign(t *testing.T) {
	f := newFixture(t)
	d := f.draft(t)
	_, err := f.s.db.Exec(context.Background(), `UPDATE newsletter_studio_drafts SET campaign_id=41,delivery_provider='legacy' WHERE id=$1::text::uuid`, d.ID)
	if err != nil {
		t.Fatal(err)
	}
	for _, action := range []string{"send", "test", "refresh", "schedule", "cancel", "save"} {
		w := f.action(t, d, action, map[string]any{"subject": d.Subject, "markdown": d.Markdown})
		if w.Code != 409 || !strings.Contains(w.Body.String(), "previous email provider") {
			t.Fatal("legacy campaign reached local delivery", action, w.Code, w.Body)
		}
	}
	if f.mail.creates+f.mail.tests+f.mail.sends+f.mail.updates != 0 {
		t.Fatal("legacy campaign touched provider")
	}
}

func TestSignInOnlyReturnsToTheDesksOwnPages(t *testing.T) {
	for path, want := range map[string]string{
		"/admin/posts":                         "/admin/posts",
		"/admin/newsletters?doc=abc&view=send": "/admin/newsletters?doc=abc&view=send",
		"/p/a5cd8282":                          "/p/a5cd8282",
		"":                                     "",
		"/":                                    "",
		"/blog/post":                           "",
		"/admin/signin":                        "",
		"/admin/signin?next=/admin/posts":      "",
		"//evil.example/admin/posts":           "",
		"https://evil.example/admin/posts":     "",
		"/admin//evil.example":                 "",
		"/admin/%2F%2Fevil.example":            "",
		"/admin/..//evil.example":              "",
		"/admin/../blog":                       "",
		"/admin/\\evil.example":                "",
		"/admin/posts\r\nSet-Cookie: x=1":      "",
		"/admin/" + strings.Repeat("a", 600):   "",
	} {
		if got := safeReturn(path); got != want {
			t.Errorf("safeReturn(%q) = %q, want %q", path, got, want)
		}
	}
}
