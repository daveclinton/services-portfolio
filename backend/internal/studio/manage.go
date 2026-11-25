package studio

import (
	"context"
	"net/http"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
)

// manage runs one owner action under the same lock as saving and delivery, so
// removal cannot race an autosave, a publication or a send. The database
// connection is released before the public cache hook is awaited.
func (s *Service) manage(allowed func(Draft) string, apply func(context.Context, pgx.Tx, Draft) (any, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		if d.Revision != revisionOf(body) {
			httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This document changed. Reload it before continuing."})
			return
		}
		if problem := allowed(d); problem != "" {
			httpx.WriteJSON(w, 409, httpx.Problem{Detail: problem})
			return
		}
		tx, err := conn.Begin(r.Context())
		if err != nil {
			draftFailure(w, err)
			return
		}
		defer tx.Rollback(context.Background())
		result, err := apply(r.Context(), tx, d)
		if err == nil {
			err = tx.Commit(r.Context())
		}
		if err != nil {
			draftFailure(w, err)
			return
		}
		release()
		release = nil
		if d.PublishedRevision > 0 {
			updated := s.revalidate()
			switch value := result.(type) {
			case *Draft:
				value.CacheInvalidated = &updated
			case map[string]any:
				value["cache_invalidated"] = updated
			}
		}
		httpx.WriteJSON(w, 200, result)
	}
}

func publishedOnly(d Draft) string {
	if d.Kind != "post" || d.PublishedRevision < 1 {
		return "This post is not published."
	}
	return ""
}

// Unpublishing returns the post to a private draft. Its URL stays reserved and
// its original date is kept for republishing.
func unpublishPost(ctx context.Context, tx pgx.Tx, d Draft) (any, error) {
	updated, err := scanDraft(tx.QueryRow(ctx, `UPDATE newsletter_studio_drafts SET published_revision=0,legacy=false,first_published_at=(SELECT published_at FROM studio_posts WHERE draft_id=$1::text::uuid),updated_at=NOW() WHERE id=$1::text::uuid RETURNING `+draftColumns, d.ID))
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `DELETE FROM studio_posts WHERE draft_id=$1::text::uuid`, d.ID)
	return &updated, err
}

// Discarding restores the public snapshot over unpublished edits.
func discardChanges(ctx context.Context, tx pgx.Tx, d Draft) (any, error) {
	updated, err := scanDraft(tx.QueryRow(ctx, `UPDATE newsletter_studio_drafts SET subject=p.public_title,markdown=p.public_markdown,description=p.public_description,revision=newsletter_studio_drafts.revision+1,published_revision=newsletter_studio_drafts.revision+1,last_error='',updated_at=NOW() FROM (SELECT draft_id,title,markdown,description FROM studio_posts WHERE draft_id=$1::text::uuid) AS p(draft_id,public_title,public_markdown,public_description) WHERE id=p.draft_id RETURNING `+draftColumns, d.ID))
	if err != nil {
		return nil, err
	}
	_, err = tx.Exec(ctx, `UPDATE studio_posts SET revision=$2 WHERE draft_id=$1::text::uuid`, d.ID, updated.Revision)
	return &updated, err
}

// Sent, scheduled and uncertain deliveries stay as a record of what went out.
func deletable(d Draft) string {
	if d.Kind != "post" && (d.Operation != "" || (d.State != "draft" && d.State != "error")) {
		return "This newsletter has entered delivery and stays as a record."
	}
	return ""
}

// The tombstone keeps versioned articles from being imported again on restart
// and tells the site to hide its bundled copy.
func deleteDocument(ctx context.Context, tx pgx.Tx, d Draft) (any, error) {
	if _, err := tx.Exec(ctx, `DELETE FROM studio_posts WHERE draft_id=$1::text::uuid`, d.ID); err != nil {
		return nil, err
	}
	if d.Kind == "post" && d.Slug != "" {
		if _, err := tx.Exec(ctx, `INSERT INTO studio_deleted_posts(slug) VALUES($1) ON CONFLICT DO NOTHING`, d.Slug); err != nil {
			return nil, err
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM newsletter_studio_drafts WHERE id=$1::text::uuid`, d.ID); err != nil {
		return nil, err
	}
	return map[string]any{"deleted": d.ID}, nil
}

// removedSlugs lists formerly public URLs that the site must no longer serve.
func (s *Service) removedSlugs(ctx context.Context) ([]string, error) {
	rows, err := s.db.Query(ctx, `SELECT slug FROM studio_deleted_posts UNION SELECT slug FROM newsletter_studio_drafts WHERE kind='post' AND slug<>'' AND published_revision=0 ORDER BY slug`)
	if err != nil {
		return nil, err
	}
	slugs, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if slugs == nil {
		slugs = []string{}
	}
	return slugs, err
}
