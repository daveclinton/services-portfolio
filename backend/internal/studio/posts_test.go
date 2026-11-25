package studio

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestPublishedSnapshotSurvivesAutosavesAndCreatesNewsletterOnServer(t *testing.T) {
	f := newFixture(t)
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "A new article", "kind": "post"}))
	path := "/admin/newsletters/drafts/" + d.ID
	d = decodeDraft(t, f.request("POST", path+"/save", map[string]any{"subject": d.Subject, "markdown": "## First\n\nPublished **body**.", "revision": d.Revision}))
	publish := map[string]any{"revision": d.Revision, "slug": "new-article", "description": "A published summary."}
	stale := f.request("POST", path+"/publish", map[string]any{"revision": 1, "slug": "new-article", "description": "Summary"})
	if stale.Code != 409 {
		t.Fatalf("stale revision published: %d", stale.Code)
	}
	d = decodeDraft(t, f.request("POST", path+"/publish", publish))
	if d.PublishedRevision != d.Revision || d.Slug != "new-article" {
		t.Fatalf("publication not acknowledged: %+v", d)
	}
	response := f.request("GET", "/blog/posts/new-article", nil)
	var post Post
	json.Unmarshal(response.Body.Bytes(), &post)
	if response.Code != 200 || !strings.Contains(post.HTML, "<strong>body</strong>") {
		t.Fatalf("missing public body: %s", response.Body)
	}
	etag := response.Header().Get("ETag")
	d = decodeDraft(t, f.request("POST", path+"/save", map[string]any{"subject": d.Subject, "markdown": "Private revision", "revision": d.Revision}))
	response = f.request("GET", "/blog/posts/new-article", nil)
	if response.Header().Get("ETag") != etag || strings.Contains(response.Body.String(), "Private revision") {
		t.Fatal("autosave changed public content")
	}
	newsletter := decodeDraft(t, f.request("POST", "/admin/newsletters/from-post", map[string]any{"slug": "new-article"}))
	if newsletter.Kind != "newsletter" || newsletter.Subject != "A new article" || !strings.Contains(newsletter.Markdown, "/blog/new-article>") {
		t.Fatalf("invalid newsletter: %+v", newsletter)
	}
	if f.mail.sends != 0 || f.mail.creates != 0 {
		t.Fatal("publication or newsletter creation sent email")
	}
	if w := f.request("POST", path+"/send", map[string]any{"revision": d.Revision}); w.Code != 400 {
		t.Fatalf("post accepted as a broadcast: %d", w.Code)
	}
	if w := f.request("POST", "/admin/newsletters/from-post", map[string]any{"slug": "unpublished"}); w.Code != 404 {
		t.Fatal("unpublished source accepted")
	}
	second := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "Second", "kind": "post"}))
	second = decodeDraft(t, f.request("POST", "/admin/newsletters/drafts/"+second.ID+"/save", map[string]any{"subject": "Second", "markdown": "Different content", "revision": second.Revision}))
	w := f.request("POST", "/admin/newsletters/drafts/"+second.ID+"/publish", map[string]any{"revision": second.Revision, "slug": "new-article", "description": "Summary"})
	if w.Code != 409 {
		t.Fatalf("duplicate URL replaced a post: %d", w.Code)
	}
	if err := f.s.Init(context.Background()); err != nil {
		t.Fatal(err)
	}
	response = f.request("GET", path, nil)
	after := decodeDraft(t, response)
	if after.Markdown != "Private revision" {
		t.Fatal("restart/import overwrote owner edits")
	}
}

func TestPublishInvalidatesPublicCacheAfterReleasingDatabaseConnection(t *testing.T) {
	f := newFixture(t)
	var called atomic.Bool
	hook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/content/revalidate" || r.Header.Get("Authorization") != "Bearer "+strings.Repeat("s", 40) {
			t.Error("invalid cache hook")
		}
		if f.s.db.Stat().AcquiredConns() != 0 {
			t.Error("publication held a database connection while waiting on the frontend")
		}
		called.Store(true)
		w.WriteHeader(200)
	}))
	defer hook.Close()
	f.s.cfg.SiteURL = hook.URL
	f.s.cfg.ContentRevalidationSecret = strings.Repeat("s", 40)
	d := decodeDraft(t, f.request("POST", "/admin/newsletters/drafts", map[string]any{"subject": "Post", "kind": "post"}))
	path := "/admin/newsletters/drafts/" + d.ID
	d = decodeDraft(t, f.request("POST", path+"/save", map[string]any{"subject": "Post", "markdown": "Public body", "revision": d.Revision}))
	d = decodeDraft(t, f.request("POST", path+"/publish", map[string]any{"revision": d.Revision, "slug": "post", "description": "Summary"}))
	if !called.Load() || d.CacheInvalidated == nil || !*d.CacheInvalidated {
		t.Fatal("public cache was not refreshed")
	}
}

func TestBootstrapOmitsBodiesAndDoesNotExposePrivateDataWithoutSession(t *testing.T) {
	f := newFixture(t)
	marker := strings.Repeat("private-draft-body ", 2000)
	_, err := f.s.db.Exec(context.Background(), `INSERT INTO newsletter_studio_drafts(id,subject,markdown,kind) SELECT md5(n::text)::uuid,'Large draft', $1,'post' FROM generate_series(1,100)n`, marker)
	if err != nil {
		t.Fatal(err)
	}
	legacy := f.request("GET", "/admin/newsletters/drafts", nil)
	response := f.request("GET", "/admin/newsletters/bootstrap?section=posts", nil)
	if response.Code != 200 || strings.Contains(response.Body.String(), marker) || !strings.Contains(response.Body.String(), `"authenticated":true`) {
		t.Fatalf("invalid bootstrap: %s", response.Body)
	}
	if response.Body.Len() > 100000 {
		t.Fatal("bootstrap downloads document bodies")
	}
	t.Logf("100 large drafts: old list %d bytes; bootstrap including published catalogue %d bytes", legacy.Body.Len(), response.Body.Len())
	request := httptest.NewRequest("GET", "/admin/newsletters/bootstrap?section=posts", nil)
	unauth := httptest.NewRecorder()
	f.handler.ServeHTTP(unauth, request)
	if strings.Contains(unauth.Body.String(), "Large draft") || strings.Contains(unauth.Body.String(), "description") {
		t.Fatal("private desk data leaked before authentication")
	}
	if response.Header().Get("Cache-Control") != "no-store" || response.Header().Get("Server-Timing") == "" {
		t.Fatal("missing privacy/performance headers")
	}
}

func TestUploadsRequireOwnerAndCSRFAndAreDurableImmutableRasterAssets(t *testing.T) {
	f := newFixture(t)
	var imageData bytes.Buffer
	png.Encode(&imageData, image.NewRGBA(image.Rect(0, 0, 2, 3)))
	upload := func(data []byte, token, csrf string) *httptest.ResponseRecorder {
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		file, _ := form.CreateFormFile("file", "image.png")
		file.Write(data)
		form.Close()
		r := httptest.NewRequest("POST", "/admin/newsletters/media", &body)
		r.Header.Set("Origin", f.s.cfg.SiteURL)
		r.Header.Set("Content-Type", form.FormDataContentType())
		r.Header.Set("X-CSRF-Token", csrf)
		if token != "" {
			r.AddCookie(f.s.cookie(f.s.ownerCookie(), token, 3600))
		}
		w := httptest.NewRecorder()
		f.handler.ServeHTTP(w, r)
		return w
	}
	if w := upload(imageData.Bytes(), "", f.csrf); w.Code != 401 {
		t.Fatal("unauthenticated upload accepted")
	}
	if w := upload(imageData.Bytes(), f.token, "wrong"); w.Code != 403 {
		t.Fatal("upload bypassed CSRF")
	}
	if w := upload([]byte(`<svg onload="alert(1)"></svg>`), f.token, f.csrf); w.Code != 400 {
		t.Fatal("active content accepted as an image")
	}
	response := upload(imageData.Bytes(), f.token, f.csrf)
	if response.Code != 201 {
		t.Fatalf("upload failed: %s", response.Body)
	}
	var value struct {
		URL           string `json:"url"`
		Width, Height int
	}
	json.Unmarshal(response.Body.Bytes(), &value)
	if value.Width != 2 || value.Height != 3 {
		t.Fatal("incorrect dimensions")
	}
	path := value.URL[strings.LastIndex(value.URL, "/media/"):]
	media := f.request("GET", path, nil)
	if media.Code != 200 || !bytes.Equal(media.Body.Bytes(), imageData.Bytes()) || !strings.Contains(media.Header().Get("Cache-Control"), "immutable") || media.Header().Get("Content-Type") != "image/png" {
		t.Fatal("uploaded bytes are not durable and cacheable")
	}
	r := httptest.NewRequest("GET", path, nil)
	r.Header.Set("If-None-Match", media.Header().Get("ETag"))
	w := httptest.NewRecorder()
	f.handler.ServeHTTP(w, r)
	if w.Code != 304 || w.Body.Len() != 0 {
		t.Fatal("image was downloaded again despite matching ETag")
	}
}
