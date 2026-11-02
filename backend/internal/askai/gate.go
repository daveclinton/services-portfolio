package askai

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/config"
	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/ratelimit"
)

const chatLockTTL = 65 * time.Second

type keyKind int

const (
	byVisitor keyKind = iota
	byIP
	bySite
)

type limitRule struct {
	name   string
	key    keyKind
	window *ratelimit.Window
}

type limits struct {
	chat   []limitRule
	search []limitRule
}

// newLimits sets the same budgets the Next.js routes had. Checks run in order
// and stop at the first one that fails.
func newLimits(cfg config.Config) limits {
	return limits{
		chat: []limitRule{
			{"burst", byVisitor, ratelimit.NewWindow(3, time.Minute)},
			{"visitor-hour", byVisitor, ratelimit.NewWindow(15, time.Hour)},
			{"visitor-day", byVisitor, ratelimit.NewWindow(30, 24*time.Hour)},
			{"ip-hour", byIP, ratelimit.NewWindow(40, time.Hour)},
			{"global-day", bySite, ratelimit.NewWindow(cfg.AIGlobalDailyLimit, 24*time.Hour)},
		},
		search: []limitRule{
			{"burst", byVisitor, ratelimit.NewWindow(20, time.Minute)},
			{"visitor-day", byVisitor, ratelimit.NewWindow(200, 24*time.Hour)},
			{"ip-hour", byIP, ratelimit.NewWindow(100, time.Hour)},
			{"global-day", bySite, ratelimit.NewWindow(cfg.SearchGlobalDailyLimit, 24*time.Hour)},
		},
	}
}

func (l limits) sweep() {
	for _, rule := range append(append([]limitRule{}, l.chat...), l.search...) {
		rule.window.Sweep()
	}
}

type gate struct {
	allowed   bool
	visitorID string
	failed    string
	result    ratelimit.Result // the failing check's result
	daily     *ratelimit.Result
}

// enforce identifies the visitor, sets the visitor cookie and daily-budget
// headers on w, and runs the endpoint's limit checks.
func (s *Service) enforce(w http.ResponseWriter, r *http.Request, rules []limitRule) gate {
	if !s.cfg.RateLimitsEnabled() {
		return gate{allowed: true, visitorID: httpx.NewUUID()}
	}
	visitorID, ok := s.signer.Read(r)
	if !ok {
		visitorID = httpx.NewUUID()
		http.SetCookie(w, s.signer.Cookie(visitorID, s.cfg.Production()))
	}
	ipKey := s.signer.Hash("ip:" + httpx.ClientIP(r, s.cfg.TrustProxyHeaders))

	g := gate{allowed: true, visitorID: visitorID}
	for _, rule := range rules {
		key := "site"
		switch rule.key {
		case byVisitor:
			key = visitorID
		case byIP:
			key = ipKey
		}
		result := rule.window.Allow(key)
		if rule.name == "visitor-day" {
			g.daily = &result
		}
		if !result.Allowed {
			g.allowed, g.failed, g.result = false, rule.name, result
			break
		}
	}
	if g.daily != nil {
		h := w.Header()
		h.Set("X-RateLimit-Limit", strconv.Itoa(g.daily.Limit))
		h.Set("X-RateLimit-Remaining", strconv.Itoa(g.daily.Remaining))
		h.Set("X-RateLimit-Reset", strconv.FormatInt(g.daily.Reset.UnixMilli(), 10))
	}
	return g
}

func writeRateLimited(w http.ResponseWriter, g gate) {
	retryAfter := max(1, int(math.Ceil(time.Until(g.result.Reset).Seconds())))
	w.Header().Set("Retry-After", fmt.Sprint(retryAfter))
	httpx.WriteJSON(w, http.StatusTooManyRequests, map[string]any{
		"detail":            "Too many requests. Please try again shortly.",
		"code":              "rate_limited",
		"limit":             g.failed,
		"retryAfter":        retryAfter,
		"challengeRequired": g.failed == "ip-hour",
	})
}

func (s *Service) acquireChatLock(visitorID string) (string, bool) {
	if !s.cfg.RateLimitsEnabled() {
		return "", true
	}
	return s.locks.Acquire(visitorID)
}

func (s *Service) releaseChatLock(visitorID, token string) {
	if s.cfg.RateLimitsEnabled() {
		s.locks.Release(visitorID, token)
	}
}
