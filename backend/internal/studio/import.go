package studio

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5"
)

//go:embed posts.json
var importedPosts []byte

// Import the versioned articles once. Restarts and later source deploys never
// overwrite the owner's changes or public snapshots.
func (s *Service) importPosts(ctx context.Context) error {
	var posts []Post
	if err := json.Unmarshal(importedPosts, &posts); err != nil {
		return err
	}
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	for _, p := range posts {
		var id string
		err = tx.QueryRow(ctx, `INSERT INTO newsletter_studio_drafts(id,subject,markdown,kind,slug,description,published_revision,legacy) VALUES($1::text::uuid,$2,$3,'post',$4,$5,1,true) ON CONFLICT(slug) WHERE kind='post' AND slug<>'' DO NOTHING RETURNING id::text`, httpx.NewUUID(), p.Title, p.Markdown, p.Slug, p.Description).Scan(&id)
		if err != nil {
			// Only an already-imported URL is a no-op, not a failed database write.
			if errors.Is(err, pgx.ErrNoRows) {
				continue
			}
			return err
		}
		html, err := sendy.RenderMarkdown(p.Markdown, s.cfg.SiteURL)
		if err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO studio_posts(slug,draft_id,title,description,markdown,html,revision,legacy,published_at,reading_minutes) VALUES($1,$2::text::uuid,$3,$4,$5,$6,1,true,$7::date,$8) ON CONFLICT(slug) DO NOTHING`, p.Slug, id, p.Title, p.Description, p.Markdown, html, p.Date, readingMinutes(p.Markdown))
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
