package visitor

import (
	"net/http/httptest"
	"testing"
)

const id = "0b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90"

func TestCookieRoundTrip(t *testing.T) {
	s := NewSigner("a-very-long-secret-value-for-tests-only")
	r := httptest.NewRequest("POST", "/", nil)
	r.AddCookie(s.Cookie(id, false))
	got, ok := s.Read(r)
	if !ok || got != id {
		t.Fatalf("Read() = %q, %v", got, ok)
	}
}

func TestRejectsForgedCookie(t *testing.T) {
	s := NewSigner("a-very-long-secret-value-for-tests-only")
	other := NewSigner("another-long-secret-value-for-tests-only")
	r := httptest.NewRequest("POST", "/", nil)
	r.AddCookie(other.Cookie(id, false))
	if _, ok := s.Read(r); ok {
		t.Fatal("a cookie signed with a different secret must be rejected")
	}
}
