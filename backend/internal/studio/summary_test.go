package studio

import "testing"

func TestPostSummarySavesWithTheDraftAndIsKeptWhenNotSent(t *testing.T) {
	f := newFixture(t)
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "Bubbles", "kind": "post"}))
	path := "/admin/newsletters/drafts/" + d.ID + "/save"
	d = decodeDraft(t, f.request("POST", path, map[string]any{"subject": "Bubbles", "markdown": "Body", "description": "  What a bubble is.  ", "revision": d.Revision}))
	if d.Description != "What a bubble is." {
		t.Fatalf("summary not saved: %q", d.Description)
	}
	d = decodeDraft(t, f.request("POST", path, map[string]any{"subject": "Bubbles", "markdown": "Body 2", "revision": d.Revision}))
	if d.Description != "What a bubble is." {
		t.Fatalf("a save without a summary cleared it: %q", d.Description)
	}
	for _, bad := range []any{"two\nlines", string(make([]rune, 301)), 7} {
		if w := f.request("POST", path, map[string]any{"subject": "Bubbles", "markdown": "Body", "description": bad, "revision": d.Revision}); w.Code != 400 {
			t.Fatalf("accepted summary %v: %d", bad, w.Code)
		}
	}
	d = decodeDraft(t, f.request("POST", path, map[string]any{"subject": "Bubbles", "markdown": "Body", "description": "", "revision": d.Revision}))
	if d.Description != "" {
		t.Fatal("an emptied summary was not saved")
	}
}
