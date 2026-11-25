package studio

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5"
)

type Post struct {
	Slug           string `json:"slug"`
	Title          string `json:"title"`
	Description    string `json:"description"`
	Date           string `json:"date"`
	ReadingMinutes int    `json:"readingMinutes"`
	Legacy         bool   `json:"legacy"`
	Markdown       string `json:"markdown,omitempty"`
	HTML           string `json:"html,omitempty"`
}

// The desk only downloads document bodies when opening a document. This keeps
// bootstrap bounded even with one hundred 40 KB drafts.
func (s *Service) draftSummaries(ctx context.Context, kind string) ([]Draft, error) {
	columns := strings.Replace(draftColumns, ",markdown,", ",''::text,", 1)
	rows, err := s.db.Query(ctx, `SELECT `+columns+` FROM newsletter_studio_drafts WHERE kind=$1 AND ($1<>'post' OR published_revision<revision) ORDER BY updated_at DESC,id DESC LIMIT 100`, kind)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	drafts := []Draft{}
	for rows.Next() {
		d, err := scanDraft(rows)
		if err != nil {
			return nil, err
		}
		drafts = append(drafts, d)
	}
	return drafts, rows.Err()
}

func (s *Service) posts(ctx context.Context) ([]Post, error) {
	rows, err := s.db.Query(ctx, `SELECT slug,title,description,to_char(published_at AT TIME ZONE 'UTC','YYYY-MM-DD'),legacy,reading_minutes FROM studio_posts ORDER BY published_at DESC,slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	posts := []Post{}
	for rows.Next() {
		var p Post
		if err := rows.Scan(&p.Slug, &p.Title, &p.Description, &p.Date, &p.Legacy, &p.ReadingMinutes); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

func (s *Service) bootstrap(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if origin := r.Header.Get("Origin"); origin != "" && !s.sameOrigin(r) {
		httpx.WriteJSON(w, 403, httpx.Problem{Detail: "This dashboard request is not allowed."})
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	started := time.Now()
	login, csrf, ok := s.owner(r)
	result := map[string]any{"session": map[string]any{"configured": s.cfg.NewsletterAdminEnabled, "authenticated": ok, "login": login, "csrf": csrf}, "drafts": []Draft{}, "posts": []Post{}}
	if ok {
		kind := "post"
		if r.URL.Query().Get("section") == "newsletters" {
			kind = "newsletter"
		}
		drafts, err := s.draftSummaries(ctx, kind)
		if err != nil {
			draftFailure(w, err)
			return
		}
		posts, err := s.posts(ctx)
		if err != nil {
			draftFailure(w, err)
			return
		}
		result["drafts"] = drafts
		result["posts"] = posts
	}
	w.Header().Set("Server-Timing", fmt.Sprintf("db;dur=%.2f", float64(time.Since(started).Microseconds())/1000))
	httpx.WriteJSON(w, 200, result)
}

func (s *Service) readDraft(w http.ResponseWriter, r *http.Request) {
	d, err := s.getDraft(r.Context(), r.PathValue("id"))
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, d)
}
func (s *Service) editPost(w http.ResponseWriter, r *http.Request) {
	var id string
	err := s.db.QueryRow(r.Context(), `SELECT draft_id::text FROM studio_posts WHERE slug=$1`, r.PathValue("slug")).Scan(&id)
	if err != nil {
		draftFailure(w, err)
		return
	}
	d, err := s.getDraft(r.Context(), id)
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, d)
}

var postSlug = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// Publishing snapshots the saved revision in one transaction. Later autosaves
// cannot change the public post until the owner explicitly publishes again.
func (s *Service) publish(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	conn, d, release, ok := s.lockDraft(w, r)
	if !ok {
		return
	}
	defer func() {
		if release != nil {
			release()
		}
	}()
	if d.Kind != "post" || d.Revision != revisionOf(body) {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "Save the latest post before publishing."})
		return
	}
	slug, _ := body["slug"].(string)
	description, _ := body["description"].(string)
	description = strings.TrimSpace(description)
	if !postSlug.MatchString(slug) || len(slug) > 160 || utf8.RuneCountInString(description) > 300 || description == "" {
		httpx.BadRequest(w, "Enter a URL using lowercase words and dashes, and a summary of up to 300 characters.", nil)
		return
	}
	if d.Slug != "" && d.Slug != slug {
		httpx.BadRequest(w, "The published URL cannot change. This protects existing links.", nil)
		return
	}
	html, err := sendy.RenderMarkdown(d.Markdown, s.cfg.SiteURL)
	if err != nil {
		httpx.BadRequest(w, err.Error(), nil)
		return
	}
	tx, err := conn.Begin(r.Context())
	if err != nil {
		draftFailure(w, err)
		return
	}
	defer tx.Rollback(r.Context())
	// Reserve the URL against both unpublished imports and published posts.
	var exists bool
	err = tx.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM newsletter_studio_drafts WHERE kind='post' AND slug=$1 AND id<>$2::text::uuid)`, slug, d.ID).Scan(&exists)
	if err != nil {
		draftFailure(w, err)
		return
	}
	if exists {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "That post URL is already in use."})
		return
	}
	tag, err := tx.Exec(r.Context(), `INSERT INTO studio_posts(slug,draft_id,title,description,markdown,html,revision,reading_minutes) VALUES($1,$2::text::uuid,$3,$4,$5,$6,$7,$8) ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,markdown=EXCLUDED.markdown,html=EXCLUDED.html,revision=EXCLUDED.revision,reading_minutes=EXCLUDED.reading_minutes,legacy=false,updated_at=NOW() WHERE studio_posts.draft_id=EXCLUDED.draft_id`, slug, d.ID, d.Subject, description, d.Markdown, html, d.Revision, readingMinutes(d.Markdown))
	if err != nil {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "Could not publish at that URL. Reload and try again."})
		return
	}
	if tag.RowsAffected() != 1 {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "That post URL is already in use."})
		return
	}
	d, err = scanDraft(tx.QueryRow(r.Context(), `UPDATE newsletter_studio_drafts SET slug=$1,description=$2,published_revision=revision,legacy=false,updated_at=NOW() WHERE id=$3::text::uuid RETURNING `+draftColumns, slug, description, d.ID))
	if err == nil {
		err = tx.Commit(r.Context())
	}
	if err != nil {
		draftFailure(w, err)
		return
	}
	// Release the database connection before waiting on the frontend cache hook.
	release()
	release = nil
	updated := s.revalidate()
	d.CacheInvalidated = &updated
	httpx.WriteJSON(w, 200, d)
}

func (s *Service) newsletterFromPost(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	slug, _ := body["slug"].(string)
	var title, description string
	err := s.db.QueryRow(r.Context(), `SELECT title,description FROM studio_posts WHERE slug=$1`, slug).Scan(&title, &description)
	if err != nil {
		draftFailure(w, err)
		return
	}
	markdown := description + "\n\n[Read the post](<" + s.cfg.SiteURL + "/blog/" + slug + ">)"
	d, err := scanDraft(s.db.QueryRow(r.Context(), `INSERT INTO newsletter_studio_drafts(id,subject,markdown,kind) VALUES($1::text::uuid,$2,$3,'newsletter') RETURNING `+draftColumns, httpx.NewUUID(), title, markdown))
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 201, d)
}

func publicJSON(w http.ResponseWriter, r *http.Request, value any) {
	data, err := json.Marshal(value)
	if err != nil {
		httpx.Unavailable(w, "Could not load posts.", 5)
		return
	}
	hash := sha256.Sum256(data)
	etag := `"` + hex.EncodeToString(hash[:]) + `"`
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "public, max-age=0, must-revalidate")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(304)
		return
	}
	w.Write(data)
}
func (s *Service) publicPosts(w http.ResponseWriter, r *http.Request) {
	posts, err := s.posts(r.Context())
	if err != nil {
		draftFailure(w, err)
		return
	}
	publicJSON(w, r, map[string]any{"posts": posts})
}
func (s *Service) publicPost(w http.ResponseWriter, r *http.Request) {
	var p Post
	err := s.db.QueryRow(r.Context(), `SELECT slug,title,description,to_char(published_at AT TIME ZONE 'UTC','YYYY-MM-DD'),legacy,markdown,html FROM studio_posts WHERE slug=$1`, r.PathValue("slug")).Scan(&p.Slug, &p.Title, &p.Description, &p.Date, &p.Legacy, &p.Markdown, &p.HTML)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, 404, httpx.Problem{Detail: "Post not found."})
		return
	}
	if err != nil {
		draftFailure(w, err)
		return
	}
	p.ReadingMinutes = readingMinutes(p.Markdown)
	publicJSON(w, r, p)
}

func readingMinutes(markdown string) int {
	return max(1, int(float64(len(strings.Fields(markdown)))/230+0.5))
}
