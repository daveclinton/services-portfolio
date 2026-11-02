// Package ratelimit provides in-memory sliding-window limiters and
// per-key locks. One API process runs on one VPS, so process memory is the
// simplest correct store. If you ever run several replicas, put the same
// interface in front of Redis instead.
package ratelimit

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Result struct {
	Allowed   bool
	Limit     int
	Remaining int
	Reset     time.Time // when the oldest counted request leaves the window
}

// Window allows at most Limit requests per key in any rolling Period.
// It stores the timestamp of each counted request (a sliding-window log).
type Window struct {
	Limit  int
	Period time.Duration

	mu   sync.Mutex
	hits map[string][]time.Time
	now  func() time.Time
}

func NewWindow(limit int, period time.Duration) *Window {
	return &Window{Limit: limit, Period: period, hits: map[string][]time.Time{}, now: time.Now}
}

// Allow counts the request when the key is under its limit.
func (w *Window) Allow(key string) Result {
	now := w.now()
	w.mu.Lock()
	defer w.mu.Unlock()

	hits := w.prune(key, now)
	if len(hits) >= w.Limit {
		return Result{Allowed: false, Limit: w.Limit, Remaining: 0, Reset: hits[0].Add(w.Period)}
	}
	hits = append(hits, now)
	w.hits[key] = hits
	return Result{Allowed: true, Limit: w.Limit, Remaining: w.Limit - len(hits), Reset: hits[0].Add(w.Period)}
}

func (w *Window) prune(key string, now time.Time) []time.Time {
	hits := w.hits[key]
	cutoff := now.Add(-w.Period)
	i := 0
	for i < len(hits) && !hits[i].After(cutoff) {
		i++
	}
	hits = hits[i:]
	if len(hits) == 0 {
		delete(w.hits, key)
		return nil
	}
	w.hits[key] = hits
	return hits
}

// Sweep drops keys whose requests have all expired so memory stays bounded.
func (w *Window) Sweep() {
	now := w.now()
	w.mu.Lock()
	defer w.mu.Unlock()
	for key := range w.hits {
		w.prune(key, now)
	}
}

// Locks is a set of expiring per-key locks; each holder gets a token so a
// late release can't free someone else's lock.
type Locks struct {
	TTL time.Duration

	mu   sync.Mutex
	held map[string]lock
	now  func() time.Time
}

type lock struct {
	token   string
	expires time.Time
}

func NewLocks(ttl time.Duration) *Locks {
	return &Locks{TTL: ttl, held: map[string]lock{}, now: time.Now}
}

func (l *Locks) Acquire(key string) (token string, ok bool) {
	now := l.now()
	l.mu.Lock()
	defer l.mu.Unlock()
	if current, exists := l.held[key]; exists && now.Before(current.expires) {
		return "", false
	}
	token = randomToken()
	l.held[key] = lock{token: token, expires: now.Add(l.TTL)}
	return token, true
}

func (l *Locks) Release(key, token string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if current, exists := l.held[key]; exists && current.token == token {
		delete(l.held, key)
	}
}

func (l *Locks) Sweep() {
	now := l.now()
	l.mu.Lock()
	defer l.mu.Unlock()
	for key, current := range l.held {
		if !now.Before(current.expires) {
			delete(l.held, key)
		}
	}
}

func randomToken() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}
