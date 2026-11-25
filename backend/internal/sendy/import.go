package sendy

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"net/mail"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
)

// ImportSubscribers imports a normalized export without sending any email.
// A subscribed row requires its original consent timestamp; suppression always
// wins over active membership, regardless of file order or existing local data.
func (c *Client) ImportSubscribers(ctx context.Context, input io.Reader) (int, error) {
	reader := csv.NewReader(input)
	header, err := reader.Read()
	if err != nil {
		return 0, errors.New("read CSV header")
	}
	if strings.Join(header, ",") != "email,status,confirmed_at" {
		return 0, errors.New("CSV header must be email,status,confirmed_at")
	}
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)
	count := 0
	for {
		row, err := reader.Read()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil || len(row) != 3 {
			return 0, fmt.Errorf("invalid CSV row %d", count+2)
		}
		email := strings.ToLower(strings.TrimSpace(row[0]))
		parsed, err := mail.ParseAddress(email)
		if err != nil || parsed.Address != email || len(email) > 254 {
			return 0, fmt.Errorf("invalid email at row %d", count+2)
		}
		status := strings.TrimSpace(row[1])
		if status != "pending" && status != "subscribed" && status != "suppressed" {
			return 0, fmt.Errorf("invalid status at row %d", count+2)
		}
		var confirmed *time.Time
		if value := strings.TrimSpace(row[2]); value != "" {
			when, err := time.Parse(time.RFC3339, value)
			if err != nil || when.After(time.Now()) {
				return 0, fmt.Errorf("invalid consent timestamp at row %d", count+2)
			}
			confirmed = &when
		}
		if status == "subscribed" && confirmed == nil {
			return 0, fmt.Errorf("subscribed row %d requires its original consent timestamp", count+2)
		}
		_, err = tx.Exec(ctx, `INSERT INTO newsletter_subscribers(id,email,status,confirmation_nonce,confirmation_expires_at,confirmed_at) VALUES($1::text::uuid,$2,$3,$4::text::uuid,NOW(),$5) ON CONFLICT(email) DO UPDATE SET status=CASE WHEN newsletter_subscribers.status='suppressed' OR EXCLUDED.status='suppressed' THEN 'suppressed' WHEN newsletter_subscribers.status='subscribed' OR EXCLUDED.status='subscribed' THEN 'subscribed' ELSE 'pending' END,confirmed_at=COALESCE(newsletter_subscribers.confirmed_at,EXCLUDED.confirmed_at),updated_at=NOW()`, httpx.NewUUID(), email, status, httpx.NewUUID(), confirmed)
		if err != nil {
			return 0, errors.New("store imported subscriber")
		}
		count++
	}
	return count, tx.Commit(ctx)
}
