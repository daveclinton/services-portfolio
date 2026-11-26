package studio

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/daveclinton/portfolio/backend/internal/sendy"
)

func TestContactsListSubscribersForTheOwnerOnly(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	if err := sendy.NewNewsletter("", f.s.db, sendy.Address{}, "", "", "").Init(ctx); err != nil {
		t.Fatal(err)
	}
	_, err := f.s.db.Exec(ctx, `INSERT INTO newsletter_subscribers(id,email,status,confirmation_nonce,confirmation_expires_at,confirmed_at,created_at) VALUES
	 (gen_random_uuid(),'old@example.com','subscribed',gen_random_uuid(),NOW(),NOW()-INTERVAL '2 days',NOW()-INTERVAL '3 days'),
	 (gen_random_uuid(),'new@example.com','subscribed',gen_random_uuid(),NOW(),NOW()-INTERVAL '1 hour',NOW()-INTERVAL '2 hours'),
	 (gen_random_uuid(),'wait@example.com','pending',gen_random_uuid(),NOW(),NULL,NOW()-INTERVAL '1 day'),
	 (gen_random_uuid(),'gone@example.com','suppressed',gen_random_uuid(),NOW(),NULL,NOW()-INTERVAL '5 days')`)
	if err != nil {
		t.Fatal(err)
	}
	w := f.request("GET", "/admin/newsletters/contacts", nil)
	var body struct{ Contacts []Contact }
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil || w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	var order []string
	for _, c := range body.Contacts {
		order = append(order, c.Email+":"+c.Status)
	}
	if got := strings.Join(order, ","); got != "new@example.com:subscribed,wait@example.com:pending,old@example.com:subscribed,gone@example.com:suppressed" {
		t.Fatalf("unexpected contacts: %s", got)
	}
	if w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("contact list may be cached")
	}
	anonymous := httptest.NewRecorder()
	f.handler.ServeHTTP(anonymous, httptest.NewRequest("GET", "/admin/newsletters/contacts", nil))
	if anonymous.Code != 401 || strings.Contains(anonymous.Body.String(), "@example.com") {
		t.Fatalf("contacts exposed without sign-in: %d", anonymous.Code)
	}
}
