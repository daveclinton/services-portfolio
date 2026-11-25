package studio

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

type catalogue struct {
	Posts   []Post   `json:"posts"`
	Removed []string `json:"removed"`
}

func (f *fixture) catalogue(t *testing.T) (c catalogue) {
	t.Helper()
	if err := json.Unmarshal(f.request("GET", "/blog/posts", nil).Body.Bytes(), &c); err != nil {
		t.Fatal(err)
	}
	return c
}
func has(c catalogue, slug string) (public, removed bool) {
	for _, p := range c.Posts {
		public = public || p.Slug == slug
	}
	for _, s := range c.Removed {
		removed = removed || s == slug
	}
	return
}

func TestImportedPostUnpublishesRepublishesAndStaysDeleted(t *testing.T) {
	f := newFixture(t)
	first := f.catalogue(t).Posts[0]
	d := decodeDraft(t, f.request("GET", "/admin/newsletters/posts/"+first.Slug+"/draft", nil))
	path := "/admin/newsletters/drafts/" + d.ID
	if w := f.request("POST", path+"/unpublish", map[string]any{"revision": d.Revision + 1}); w.Code != 409 {
		t.Fatalf("stale unpublish: %d", w.Code)
	}
	d = decodeDraft(t, f.request("POST", path+"/unpublish", map[string]any{"revision": d.Revision}))
	if d.PublishedRevision != 0 || d.Slug != first.Slug || d.Markdown == "" {
		t.Fatalf("draft not retained: %+v", d)
	}
	if public, removed := has(f.catalogue(t), first.Slug); public || !removed {
		t.Fatal("unpublished post is still public")
	}
	if w := f.request("GET", "/blog/posts/"+first.Slug, nil); w.Code != 404 {
		t.Fatalf("body still public: %d", w.Code)
	}
	if w := f.request("POST", path+"/unpublish", map[string]any{"revision": d.Revision}); w.Code != 409 {
		t.Fatalf("second unpublish: %d", w.Code)
	}
	if err := f.s.Init(context.Background()); err != nil {
		t.Fatal(err)
	}
	if public, _ := has(f.catalogue(t), first.Slug); public {
		t.Fatal("restart republished a post")
	}
	d = decodeDraft(t, f.request("POST", path+"/publish", map[string]any{"revision": d.Revision, "slug": d.Slug, "description": "Summary"}))
	if public, removed := has(f.catalogue(t), first.Slug); !public || removed {
		t.Fatal("republish failed")
	}
	for _, p := range f.catalogue(t).Posts {
		if p.Slug == first.Slug && p.Date != first.Date {
			t.Fatalf("original date lost: %s != %s", p.Date, first.Date)
		}
	}
	if w := f.request("POST", path+"/delete", map[string]any{"revision": d.Revision}); w.Code != 200 || !strings.Contains(w.Body.String(), d.ID) {
		t.Fatalf("delete: %d %s", w.Code, w.Body)
	}
	if err := f.s.Init(context.Background()); err != nil {
		t.Fatal(err)
	}
	if public, removed := has(f.catalogue(t), first.Slug); public || !removed {
		t.Fatal("restart restored a deleted post")
	}
	if w := f.request("GET", path, nil); w.Code != 404 {
		t.Fatalf("deleted draft remains: %d", w.Code)
	}
	// A new post may take over the deleted URL.
	n := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "New", "kind": "post"}))
	n = decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+n.ID+"/save", map[string]any{"subject": "New", "markdown": "Body", "revision": n.Revision}))
	decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+n.ID+"/publish", map[string]any{"revision": n.Revision, "slug": first.Slug, "description": "S"}))
	if public, removed := has(f.catalogue(t), first.Slug); !public || removed {
		t.Fatal("reused URL stays hidden")
	}
}

func TestDiscardRestoresPublishedVersion(t *testing.T) {
	f := newFixture(t)
	first := f.catalogue(t).Posts[0]
	d := decodeDraft(t, f.request("GET", "/admin/newsletters/posts/"+first.Slug+"/draft", nil))
	path := "/admin/newsletters/drafts/" + d.ID
	original := d.Markdown
	d = decodeDraft(t, f.request("POST", path+"/save", map[string]any{"subject": "Changed", "markdown": "Changed", "revision": d.Revision}))
	d = decodeDraft(t, f.request("POST", path+"/discard", map[string]any{"revision": d.Revision}))
	if d.Markdown != original || d.Subject != first.Title || d.PublishedRevision != d.Revision {
		t.Fatalf("not restored: %+v", d)
	}
	if public, _ := has(f.catalogue(t), first.Slug); !public {
		t.Fatal("discard unpublished the post")
	}
}

func TestDeliveredNewslettersCannotBeDeleted(t *testing.T) {
	f := newFixture(t)
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "Note"}))
	path := "/admin/newsletters/drafts/" + d.ID
	for _, state := range []string{"checking", "scheduled", "sending", "sent", "stopped"} {
		if _, err := f.s.db.Exec(context.Background(), `UPDATE newsletter_studio_drafts SET state=$1`, state); err != nil {
			t.Fatal(err)
		}
		if w := f.request("POST", path+"/delete", map[string]any{"revision": d.Revision}); w.Code != 409 {
			t.Fatalf("%s newsletter deleted: %d", state, w.Code)
		}
	}
	if _, err := f.s.db.Exec(context.Background(), `UPDATE newsletter_studio_drafts SET state='draft',operation='send'`); err != nil {
		t.Fatal(err)
	}
	if w := f.request("POST", path+"/delete", map[string]any{"revision": d.Revision}); w.Code != 409 {
		t.Fatal("in-flight newsletter deleted")
	}
	if _, err := f.s.db.Exec(context.Background(), `UPDATE newsletter_studio_drafts SET operation=''`); err != nil {
		t.Fatal(err)
	}
	if w := f.request("POST", path+"/delete", map[string]any{"revision": d.Revision}); w.Code != 200 {
		t.Fatalf("draft not deleted: %s", w.Body)
	}
	if _, removed := has(f.catalogue(t), ""); removed {
		t.Fatal("newsletter left a public tombstone")
	}
}
