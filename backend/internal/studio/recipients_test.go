package studio

import (
	"context"
	"testing"

	"github.com/daveclinton/portfolio/backend/internal/sendy"
)

func TestChosenRecipientsAreValidatedAndCarriedToTheCampaign(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	if err := sendy.NewNewsletter("", f.s.db, sendy.Address{}, "", "", "").Init(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := f.s.db.Exec(ctx, `INSERT INTO newsletter_subscribers(id,email,status,confirmation_nonce,confirmation_expires_at) VALUES
	 (gen_random_uuid(),'a@example.com','subscribed',gen_random_uuid(),NOW()),(gen_random_uuid(),'b@example.com','subscribed',gen_random_uuid(),NOW()),
	 (gen_random_uuid(),'gone@example.com','suppressed',gen_random_uuid(),NOW())`); err != nil {
		t.Fatal(err)
	}
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "Note"}))
	path := "/admin/newsletters/drafts/" + d.ID
	d = decodeDraft(t, f.request("POST", path+"/save", map[string]any{"subject": "Note", "markdown": "Hello", "revision": d.Revision}))
	if d.Recipients != nil {
		t.Fatal("a new newsletter should go to everyone")
	}
	for _, bad := range []any{[]string{}, []string{"gone@example.com"}, []string{"stranger@example.com"}, []any{3}} {
		if w := f.request("POST", path+"/recipients", map[string]any{"revision": d.Revision, "recipients": bad}); w.Code != 400 {
			t.Fatalf("accepted %v: %d", bad, w.Code)
		}
	}
	if w := f.request("POST", path+"/recipients", map[string]any{"revision": d.Revision - 1, "recipients": nil}); w.Code != 409 {
		t.Fatalf("stale revision accepted: %d", w.Code)
	}
	chosen := decodeDraft(t, f.request("POST", path+"/recipients", map[string]any{"revision": d.Revision, "recipients": []string{"B@example.com", "b@example.com"}}))
	if len(chosen.Recipients) != 1 || chosen.Recipients[0] != "b@example.com" || chosen.Revision != d.Revision {
		t.Fatalf("recipients not stored: %+v", chosen)
	}
	sent := decodeDraft(t, f.request("POST", path+"/send", map[string]any{"revision": chosen.Revision}))
	if sent.State != "sending" || len(f.mail.recipients) != 1 || f.mail.recipients[0] != "b@example.com" {
		t.Fatalf("campaign did not receive the choice: %+v %v", sent, f.mail.recipients)
	}
	if w := f.request("POST", path+"/recipients", map[string]any{"revision": sent.Revision, "recipients": nil}); w.Code != 409 {
		t.Fatal("recipients changed after sending")
	}
	other := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "All"}))
	other = decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+other.ID+"/save", map[string]any{"subject": "All", "markdown": "Hi", "revision": other.Revision}))
	decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+other.ID+"/send", map[string]any{"revision": other.Revision}))
	if f.mail.recipients != nil {
		t.Fatal("a newsletter without a choice did not go to everyone")
	}
}
