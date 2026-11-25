package studio

import (
	"context"
	"encoding/json"
	"errors"
	"mime"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5"
)

type Draft struct {
	DeliveryProvider string     `json:"-"`
	ID               string     `json:"id"`
	Subject          string     `json:"subject"`
	Markdown         string     `json:"markdown"`
	Revision         int64      `json:"revision"`
	State            string     `json:"state"`
	CampaignID       int64      `json:"campaign_id"`
	Operation        string     `json:"-"`
	ScheduledAt      *time.Time `json:"scheduled_at"`
	TestedRevision   int64      `json:"tested_revision"`
	LastError        string     `json:"last_error"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

const draftColumns = `id::text,subject,markdown,revision,state,campaign_id,operation,scheduled_at,tested_revision,last_error,updated_at,delivery_provider`

func scanDraft(row pgx.Row) (Draft, error) {
	var d Draft
	err := row.Scan(&d.ID, &d.Subject, &d.Markdown, &d.Revision, &d.State, &d.CampaignID, &d.Operation, &d.ScheduledAt, &d.TestedRevision, &d.LastError, &d.UpdatedAt, &d.DeliveryProvider)
	return d, err
}
func (s *Service) getDraft(ctx context.Context, id string) (Draft, error) {
	if !httpx.IsUUID(id) {
		return Draft{}, pgx.ErrNoRows
	}
	return scanDraft(s.db.QueryRow(ctx, `SELECT `+draftColumns+` FROM newsletter_studio_drafts WHERE id=$1::text::uuid`, id))
}
func readInput(w http.ResponseWriter, r *http.Request) (map[string]any, bool) {
	media, _, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if media != "application/json" {
		httpx.WriteJSON(w, 415, httpx.Problem{Detail: "Send dashboard requests as JSON."})
		return nil, false
	}
	value, err := httpx.ReadJSON(r, 50000)
	body, ok := value.(map[string]any)
	if err != nil || !ok {
		httpx.BadRequest(w, "Please check this request.", nil)
		return nil, false
	}
	return body, true
}
func revisionOf(body map[string]any) int64 {
	n, _ := body["revision"].(json.Number)
	v, _ := n.Int64()
	return v
}
func draftFailure(w http.ResponseWriter, err error) {
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, 404, httpx.Problem{Detail: "Newsletter not found."})
		return
	}
	httpx.Unavailable(w, "Could not load this newsletter. Please try again.", 30)
}
func (s *Service) listDrafts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `SELECT `+draftColumns+` FROM newsletter_studio_drafts ORDER BY updated_at DESC LIMIT 100`)
	if err != nil {
		draftFailure(w, err)
		return
	}
	defer rows.Close()
	drafts := []Draft{}
	for rows.Next() {
		draft, err := scanDraft(rows)
		if err != nil {
			draftFailure(w, err)
			return
		}
		drafts = append(drafts, draft)
	}
	if rows.Err() != nil {
		draftFailure(w, rows.Err())
		return
	}
	httpx.WriteJSON(w, 200, map[string]any{"drafts": drafts})
}
func (s *Service) createDraft(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	subject, _ := body["subject"].(string)
	subject = strings.TrimSpace(subject)
	if subject == "" || utf8.RuneCountInString(subject) > sendy.NewsletterSubjectLimit || len(subject) > sendy.SubjectByteLimit || strings.ContainsAny(subject, "\r\n") || strings.Contains(subject, "{{") || strings.Contains(subject, "{%") {
		httpx.BadRequest(w, "Enter a subject of up to 180 characters.", nil)
		return
	}
	draft, err := scanDraft(s.db.QueryRow(r.Context(), `INSERT INTO newsletter_studio_drafts(id,subject) VALUES($1::text::uuid,$2) RETURNING `+draftColumns, httpx.NewUUID(), subject))
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 201, draft)
}
func (s *Service) saveDraft(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	subject, _ := body["subject"].(string)
	markdown, _ := body["markdown"].(string)
	subject = strings.TrimSpace(subject)
	if subject == "" || utf8.RuneCountInString(subject) > sendy.NewsletterSubjectLimit || len(subject) > sendy.SubjectByteLimit || len(markdown) > sendy.NewsletterBodyLimit || strings.ContainsAny(subject, "\r\n") || strings.Contains(subject, "{{") || strings.Contains(subject, "{%") {
		httpx.BadRequest(w, "Check the subject and newsletter length.", nil)
		return
	}
	// Saving uses the same lock as delivery so an edit cannot race the revision
	// check and campaign preparation performed by a send or test request.
	conn, current, release, ok := s.lockDraft(w, r)
	if !ok {
		return
	}
	defer release()
	draft, err := scanDraft(conn.QueryRow(r.Context(), `UPDATE newsletter_studio_drafts SET subject=$1,markdown=$2,revision=revision+1,last_error='',updated_at=NOW(),state='draft' WHERE id=$3::text::uuid AND revision=$4 AND operation='' AND state IN ('draft','error') RETURNING `+draftColumns, subject, markdown, current.ID, revisionOf(body)))
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This newsletter changed or is no longer editable. Reload it before continuing."})
		return
	}
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, draft)
}
func (s *Service) preview(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	draft, err := s.getDraft(r.Context(), r.PathValue("id"))
	if err != nil {
		draftFailure(w, err)
		return
	}
	if draft.Revision != revisionOf(body) {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "Save your latest changes before previewing."})
		return
	}
	html, err := sendy.RenderNewsletter(draft.Subject, draft.Markdown, s.cfg.SiteURL)
	if err != nil {
		httpx.BadRequest(w, err.Error(), nil)
		return
	}
	httpx.WriteJSON(w, 200, map[string]any{"html": html, "revision": draft.Revision})
}
func (s *Service) metadata(w http.ResponseWriter, r *http.Request) {
	ids, ready := s.listIDs()
	if !ready || s.cfg.SendyAPIKey == "" || s.cfg.SendySenderEmail == "" {
		httpx.Unavailable(w, "Newsletter delivery is not ready yet.", 60)
		return
	}
	count, err := s.mail.CampaignAudience(r.Context(), ids.ListID)
	if err != nil {
		httpx.Unavailable(w, "Could not load your subscriber list.", 60)
		return
	}
	httpx.WriteJSON(w, 200, map[string]any{"sender": sendy.Address{Name: s.cfg.SendySenderName, Email: s.cfg.SendySenderEmail}, "audience": "Follow along", "subscribers": count, "test_email": s.cfg.NewsletterTestEmail, "timezone": "Africa/Nairobi"})
}
