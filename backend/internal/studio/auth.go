package studio

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"golang.org/x/oauth2"
)

// The desk's own pages a sign-in may return to. Anything else, including
// another site, a protocol-relative "//host" or the sign-in page itself, falls
// back to the default, so the parameter can never become an open redirect.
const defaultReturn = "/admin/posts"

func safeReturn(path string) string {
	if len(path) > 512 || strings.ContainsAny(path, "\\\x00\r\n\t") || !(strings.HasPrefix(path, "/admin/") || strings.HasPrefix(path, "/p/")) || strings.HasPrefix(path, "/admin/signin") {
		return ""
	}
	parsed, err := url.Parse(path)
	if err != nil || parsed.Scheme != "" || parsed.Host != "" || parsed.User != nil || strings.Contains(parsed.Path, "//") || strings.Contains(parsed.Path, "/../") || strings.HasSuffix(parsed.Path, "/..") {
		return ""
	}
	return parsed.RequestURI()
}

func randomToken() string {
	var token [32]byte
	if _, err := rand.Read(token[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(token[:])
}
func (s *Service) ownerCookie() string {
	if s.cfg.Production() {
		return "__Host-portfolio_owner"
	}
	return "portfolio_owner"
}
func (s *Service) cookie(name, value string, seconds int) *http.Cookie {
	return &http.Cookie{Name: name, Value: value, Path: "/", MaxAge: seconds, HttpOnly: true, Secure: s.cfg.Production(), SameSite: http.SameSiteLaxMode}
}

// A session lasts sessionIdle past its last day of use, and never longer than
// sessionLifetime after sign-in, so the owner stays signed in on a device they
// use while a forgotten or stolen cookie still runs out.
const (
	sessionIdle     = 30 * 24 * time.Hour
	sessionLifetime = 90 * 24 * time.Hour
)

// interval spells a duration as Postgres reads it.
func interval(d time.Duration) string { return fmt.Sprintf("%d seconds", int64(d.Seconds())) }

// The owner session for the request's cookie. A live session is pushed out to
// sessionIdle again at most once a day, so reads do not write on every request.
func (s *Service) owner(r *http.Request) (string, string, bool) {
	if !s.cfg.NewsletterAdminEnabled {
		return "", "", false
	}
	cookie, err := r.Cookie(s.ownerCookie())
	if err != nil || len(cookie.Value) != 64 {
		return "", "", false
	}
	var login string
	err = s.db.QueryRow(r.Context(), `WITH live AS (
  SELECT token_hash, login, expires_at, created_at FROM newsletter_studio_sessions
  WHERE token_hash=$1 AND github_id=$2 AND expires_at>NOW()
), renewed AS (
  UPDATE newsletter_studio_sessions s SET expires_at=LEAST(live.created_at+$4::interval, NOW()+$3::interval)
  FROM live WHERE s.token_hash=live.token_hash
    AND live.expires_at < NOW()+$3::interval-INTERVAL '1 day'
    AND live.expires_at < live.created_at+$4::interval
)
SELECT login FROM live`, s.privacy.Hash("studio-session:"+cookie.Value), s.cfg.NewsletterGitHubOwnerID, interval(sessionIdle), interval(sessionLifetime)).Scan(&login)
	return login, s.privacy.Hash("studio-csrf:" + cookie.Value), err == nil
}
func (s *Service) sameOrigin(r *http.Request) bool { return r.Header.Get("Origin") == s.cfg.SiteURL }
func (s *Service) protect(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 28*time.Second)
		defer cancel()
		r = r.WithContext(ctx)
		w.Header().Set("Cache-Control", "no-store")
		if origin := r.Header.Get("Origin"); origin != "" && !s.sameOrigin(r) {
			httpx.WriteJSON(w, 403, httpx.Problem{Detail: "This dashboard request is not allowed."})
			return
		}
		_, csrf, ok := s.owner(r)
		if !ok {
			httpx.WriteJSON(w, 401, httpx.Problem{Detail: "Sign in to your newsletter dashboard."})
			return
		}
		if r.Method != "GET" && (!s.sameOrigin(r) || subtle.ConstantTimeCompare([]byte(r.Header.Get("X-CSRF-Token")), []byte(csrf)) != 1) {
			httpx.WriteJSON(w, 403, httpx.Problem{Detail: "Reload the dashboard and try again."})
			return
		}
		next(w, r)
	}
}
func (s *Service) session(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if origin := r.Header.Get("Origin"); origin != "" && !s.sameOrigin(r) {
		httpx.WriteJSON(w, 403, httpx.Problem{Detail: "This dashboard request is not allowed."})
		return
	}
	login, csrf, ok := s.owner(r)
	httpx.WriteJSON(w, 200, map[string]any{"configured": s.cfg.NewsletterAdminEnabled, "authenticated": ok, "login": login, "csrf": csrf})
}
func (s *Service) login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !s.cfg.NewsletterAdminEnabled {
		httpx.Unavailable(w, "The newsletter dashboard has not been enabled.", 60)
		return
	}
	s.loginLimit.Sweep()
	if !s.loginLimit.Allow(s.privacy.Hash("studio-login:" + httpx.ClientIP(r, s.cfg.TrustProxyHeaders))).Allowed {
		httpx.WriteJSON(w, 429, httpx.Problem{Detail: "Please wait before signing in again."})
		return
	}
	state, verifier := randomToken(), oauth2.GenerateVerifier()
	_, err := s.db.Exec(r.Context(), `DELETE FROM newsletter_studio_oauth WHERE expires_at<NOW(); DELETE FROM newsletter_studio_sessions WHERE expires_at<NOW()`)
	if err == nil {
		_, err = s.db.Exec(r.Context(), `INSERT INTO newsletter_studio_oauth(state_hash,verifier,expires_at,return_to) VALUES($1,$2,NOW()+INTERVAL '10 minutes',$3)`, s.privacy.Hash("studio-oauth:"+state), verifier, safeReturn(r.URL.Query().Get("next")))
	}
	if err != nil {
		httpx.Unavailable(w, "Sign-in is unavailable. Please try again.", 60)
		return
	}
	http.SetCookie(w, s.cookie("portfolio_oauth_state", state, 600))
	http.Redirect(w, r, s.oauth.AuthCodeURL(state, oauth2.S256ChallengeOption(verifier)), http.StatusFound)
}
func (s *Service) callback(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	// Where this sign-in returns to, once the one-time state has been checked.
	returnTo := ""
	failed := func() {
		target := s.cfg.SiteURL + "/admin/signin?login=failed"
		if returnTo != "" {
			target += "&next=" + url.QueryEscape(returnTo)
		}
		http.Redirect(w, r, target, http.StatusSeeOther)
	}
	if !s.cfg.NewsletterAdminEnabled {
		http.Error(w, "Dashboard disabled", 403)
		return
	}
	cookie, err := r.Cookie("portfolio_oauth_state")
	state := r.URL.Query().Get("state")
	http.SetCookie(w, s.cookie("portfolio_oauth_state", "", -1))
	if err != nil || len(state) != 64 || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(state)) != 1 || r.URL.Query().Get("code") == "" {
		failed()
		return
	}
	var verifier string
	err = s.db.QueryRow(r.Context(), `DELETE FROM newsletter_studio_oauth WHERE state_hash=$1 AND expires_at>NOW() RETURNING verifier, return_to`, s.privacy.Hash("studio-oauth:"+state)).Scan(&verifier, &returnTo)
	if err != nil {
		failed()
		return
	}
	returnTo = safeReturn(returnTo)
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	ctx = context.WithValue(ctx, oauth2.HTTPClient, s.http)
	token, err := s.oauth.Exchange(ctx, r.URL.Query().Get("code"), oauth2.VerifierOption(verifier))
	if err != nil {
		failed()
		return
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.identityURL, nil)
	if err != nil {
		failed()
		return
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := s.http.Do(req)
	if err != nil {
		failed()
		return
	}
	defer resp.Body.Close()
	var identity struct {
		ID    int64  `json:"id"`
		Login string `json:"login"`
	}
	if resp.StatusCode != 200 || json.NewDecoder(io.LimitReader(resp.Body, 65536)).Decode(&identity) != nil || identity.ID != s.cfg.NewsletterGitHubOwnerID || identity.Login == "" {
		failed()
		return
	}
	// The GitHub access token is intentionally not persisted or sent to the browser.
	session := randomToken()
	_, err = s.db.Exec(ctx, `INSERT INTO newsletter_studio_sessions(token_hash,github_id,login,expires_at,created_at) VALUES($1,$2,$3,NOW()+$4::interval,NOW())`, s.privacy.Hash("studio-session:"+session), identity.ID, identity.Login, interval(sessionIdle))
	if err != nil {
		failed()
		return
	}
	// The cookie may outlive the idle window; the database decides when it ends.
	http.SetCookie(w, s.cookie(s.ownerCookie(), session, int(sessionLifetime.Seconds())))
	// Straight back to the page the owner was trying to open.
	if returnTo == "" {
		returnTo = defaultReturn
	}
	http.Redirect(w, r, s.cfg.SiteURL+returnTo, http.StatusSeeOther)
}

// Signing out always ends with the browser signed out, even when the session
// has already expired: an expired session must never leave the owner stuck in
// a desk that cannot sign out. Only the same site may ask, so another site
// cannot sign the owner out.
func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !s.sameOrigin(r) {
		httpx.WriteJSON(w, 403, httpx.Problem{Detail: "This dashboard request is not allowed."})
		return
	}
	if cookie, err := r.Cookie(s.ownerCookie()); err == nil && cookie.Value != "" {
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		if _, err := s.db.Exec(ctx, `DELETE FROM newsletter_studio_sessions WHERE token_hash=$1`, s.privacy.Hash("studio-session:"+cookie.Value)); err != nil {
			httpx.Unavailable(w, "Could not sign out. Please try again.", 30)
			return
		}
	}
	http.SetCookie(w, s.cookie(s.ownerCookie(), "", -1))
	httpx.WriteJSON(w, 200, map[string]bool{"ok": true})
}
