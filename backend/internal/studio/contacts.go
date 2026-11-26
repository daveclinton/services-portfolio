package studio

import (
	"net/http"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
)

type Contact struct {
	Email       string     `json:"email"`
	Status      string     `json:"status"`
	JoinedAt    time.Time  `json:"joined_at"`
	ConfirmedAt *time.Time `json:"confirmed_at"`
}

// contactsLimit bounds one response; the desk searches and pages in the browser.
const contactsLimit = 5000

// contacts lists everyone who has signed up, for the owner only.
func (s *Service) contacts(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `SELECT email,status,created_at,confirmed_at FROM newsletter_subscribers ORDER BY COALESCE(confirmed_at,created_at) DESC,email LIMIT $1`, contactsLimit)
	if err != nil {
		draftFailure(w, err)
		return
	}
	contacts, err := pgx.CollectRows(rows, func(row pgx.CollectableRow) (Contact, error) {
		var c Contact
		return c, row.Scan(&c.Email, &c.Status, &c.JoinedAt, &c.ConfirmedAt)
	})
	if err != nil {
		draftFailure(w, err)
		return
	}
	if contacts == nil {
		contacts = []Contact{}
	}
	httpx.WriteJSON(w, 200, map[string]any{"contacts": contacts, "limit": contactsLimit})
}
