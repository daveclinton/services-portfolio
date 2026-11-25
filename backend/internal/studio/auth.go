package studio

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"golang.org/x/oauth2"
)

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
func (s *Service) owner(r *http.Request) (string, string, bool) {
	if !s.cfg.NewsletterAdminEnabled {
		return "", "", false
	}
	cookie, err := r.Cookie(s.ownerCookie())
	if err != nil || len(cookie.Value) != 64 {
		return "", "", false
	}
	var login string
	err = s.db.QueryRow(r.Context(), `SELECT login FROM newsletter_studio_sessions WHERE token_hash=$1 AND github_id=$2 AND expires_at>NOW()`, s.privacy.Hash("studio-session:"+cookie.Value), s.cfg.NewsletterGitHubOwnerID).Scan(&login)
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
		_, err = s.db.Exec(r.Context(), `INSERT INTO newsletter_studio_oauth(state_hash,verifier,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')`, s.privacy.Hash("studio-oauth:"+state), verifier)
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
	failed := func() { http.Redirect(w, r, s.cfg.SiteURL+"/admin/newsletters?login=failed", http.StatusSeeOther) }
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
	err = s.db.QueryRow(r.Context(), `DELETE FROM newsletter_studio_oauth WHERE state_hash=$1 AND expires_at>NOW() RETURNING verifier`, s.privacy.Hash("studio-oauth:"+state)).Scan(&verifier)
	if err != nil {
		failed()
		return
	}
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
	_, err = s.db.Exec(ctx, `INSERT INTO newsletter_studio_sessions(token_hash,github_id,login,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '8 hours')`, s.privacy.Hash("studio-session:"+session), identity.ID, identity.Login)
	if err != nil {
		failed()
		return
	}
	http.SetCookie(w, s.cookie(s.ownerCookie(), session, 8*60*60))
	http.Redirect(w, r, s.cfg.SiteURL+"/admin/newsletters", http.StatusSeeOther)
}
func (s *Service) logout(w http.ResponseWriter, r *http.Request) {
	cookie, _ := r.Cookie(s.ownerCookie())
	_, err := s.db.Exec(r.Context(), `DELETE FROM newsletter_studio_sessions WHERE token_hash=$1`, s.privacy.Hash("studio-session:"+cookie.Value))
	if err != nil {
		httpx.Unavailable(w, "Could not sign out. Please try again.", 30)
		return
	}
	http.SetCookie(w, s.cookie(s.ownerCookie(), "", -1))
	httpx.WriteJSON(w, 200, map[string]bool{"ok": true})
}
