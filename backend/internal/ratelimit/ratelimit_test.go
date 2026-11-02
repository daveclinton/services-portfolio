package ratelimit

import (
	"testing"
	"time"
)

func TestWindowSlides(t *testing.T) {
	clock := time.Unix(0, 0)
	w := NewWindow(2, time.Minute)
	w.now = func() time.Time { return clock }

	if r := w.Allow("a"); !r.Allowed || r.Remaining != 1 {
		t.Fatalf("first request: %+v", r)
	}
	clock = clock.Add(10 * time.Second)
	if r := w.Allow("a"); !r.Allowed || r.Remaining != 0 {
		t.Fatalf("second request: %+v", r)
	}
	if r := w.Allow("a"); r.Allowed {
		t.Fatalf("third request should be blocked: %+v", r)
	}
	if r := w.Allow("b"); !r.Allowed {
		t.Fatalf("other keys are independent: %+v", r)
	}

	clock = clock.Add(51 * time.Second) // the first hit has left the window
	if r := w.Allow("a"); !r.Allowed {
		t.Fatalf("request after the window slid: %+v", r)
	}
}

func TestBlockedRequestsAreNotCounted(t *testing.T) {
	clock := time.Unix(0, 0)
	w := NewWindow(1, time.Minute)
	w.now = func() time.Time { return clock }
	w.Allow("a")
	for range 5 {
		w.Allow("a")
	}
	clock = clock.Add(61 * time.Second)
	if r := w.Allow("a"); !r.Allowed {
		t.Fatalf("blocked attempts must not extend the window: %+v", r)
	}
}

func TestLocks(t *testing.T) {
	clock := time.Unix(0, 0)
	l := NewLocks(time.Minute)
	l.now = func() time.Time { return clock }

	token, ok := l.Acquire("v")
	if !ok {
		t.Fatal("first acquire should succeed")
	}
	if _, ok := l.Acquire("v"); ok {
		t.Fatal("second acquire should fail while held")
	}
	l.Release("v", "wrong-token")
	if _, ok := l.Acquire("v"); ok {
		t.Fatal("a wrong token must not release the lock")
	}
	l.Release("v", token)
	if _, ok := l.Acquire("v"); !ok {
		t.Fatal("acquire after release should succeed")
	}
	clock = clock.Add(2 * time.Minute)
	if _, ok := l.Acquire("v"); !ok {
		t.Fatal("expired locks are reclaimable")
	}
}
