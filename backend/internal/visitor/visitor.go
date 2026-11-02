// Package visitor issues and verifies the signed anonymous visitor cookie used
// for per-visitor rate limits, and hashes values so raw IPs are never stored.
package visitor

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"regexp"
	"strings"
)

const (
	CookieName = "portfolio_visitor"
	maxAge     = 60 * 60 * 24 * 365
)

var idPattern = regexp.MustCompile(`^[0-9a-f-]{36}$`)

type Signer struct {
	secret []byte
}

func NewSigner(secret string) Signer { return Signer{secret: []byte(secret)} }

func (s Signer) mac(message string) []byte {
	h := hmac.New(sha256.New, s.secret)
	h.Write([]byte(message))
	return h.Sum(nil)
}

func (s Signer) Sign(id string) string {
	return base64.RawURLEncoding.EncodeToString(s.mac("visitor:" + id))
}

// Read returns the visitor ID from a valid signed cookie.
func (s Signer) Read(r *http.Request) (string, bool) {
	cookie, err := r.Cookie(CookieName)
	if err != nil {
		return "", false
	}
	separator := strings.LastIndex(cookie.Value, ".")
	if separator <= 0 {
		return "", false
	}
	id, signature := cookie.Value[:separator], cookie.Value[separator+1:]
	if !idPattern.MatchString(id) || signature == "" {
		return "", false
	}
	if !hmac.Equal([]byte(signature), []byte(s.Sign(id))) {
		return "", false
	}
	return id, true
}

func (s Signer) Cookie(id string, secure bool) *http.Cookie {
	return &http.Cookie{
		Name:     CookieName,
		Value:    id + "." + s.Sign(id),
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
	}
}

// Hash returns a hex HMAC of a purpose-prefixed value, e.g. Hash("ip:" + ip).
func (s Signer) Hash(value string) string {
	return hex.EncodeToString(s.mac(value))
}
