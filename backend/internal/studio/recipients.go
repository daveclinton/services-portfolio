package studio

import (
	"net/http"
	"slices"
	"strings"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
)

// setRecipients stores who a newsletter goes to: null for all confirmed
// subscribers, or a list of them. It never changes content or the revision.
func (s *Service) setRecipients(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	var emails []string
	if value, present := body["recipients"]; present && value != nil {
		list, isList := value.([]any)
		if !isList || len(list) == 0 || len(list) > contactsLimit {
			httpx.BadRequest(w, "Choose at least one contact.", nil)
			return
		}
		for _, item := range list {
			email, isText := item.(string)
			if !isText || email == "" {
				httpx.BadRequest(w, "Choose contacts from your list.", nil)
				return
			}
			emails = append(emails, strings.ToLower(email))
		}
		slices.Sort(emails)
		emails = slices.Compact(emails)
	}
	conn, d, release, ok := s.lockDraft(w, r)
	if !ok {
		return
	}
	defer release()
	if d.Kind != "newsletter" || d.Revision != revisionOf(body) || d.Operation != "" || (d.State != "draft" && d.State != "error") {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This newsletter changed or is already being delivered. Reload it before continuing."})
		return
	}
	if emails != nil {
		var confirmed int
		if err := conn.QueryRow(r.Context(), `SELECT COUNT(*) FROM newsletter_subscribers WHERE status='subscribed' AND email=ANY($1)`, emails).Scan(&confirmed); err != nil {
			draftFailure(w, err)
			return
		}
		if confirmed != len(emails) {
			httpx.BadRequest(w, "Some chosen contacts are no longer subscribed. Reload your contacts and choose again.", nil)
			return
		}
	}
	updated, err := scanDraft(conn.QueryRow(r.Context(), `UPDATE newsletter_studio_drafts SET recipients=$1,updated_at=NOW() WHERE id=$2::text::uuid RETURNING `+draftColumns, emails, d.ID))
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, updated)
}
