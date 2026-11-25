package sendy

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Campaign struct {
	ID           int64
	Name, Status string
	LastError    string
	ScheduledAt  *time.Time
	Recipients   struct{ ListIDs []int64 }
}

func (c *Client) CreateCampaign(ctx context.Context, name, subject, body string, sender Address, _ int64) (int64, error) {
	var id int64
	err := c.db.QueryRow(ctx, `INSERT INTO newsletter_campaigns(name,subject,html,sender_email,sender_name) VALUES($1,$2,$3,$4,$5) ON CONFLICT(name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, name, subject, body, sender.Email, sender.Name).Scan(&id)
	return id, err
}
func (c *Client) GetCampaign(ctx context.Context, id int64) (Campaign, error) {
	var result Campaign
	var needsCredits bool
	err := c.db.QueryRow(ctx, `SELECT id,name,status,scheduled_at,EXISTS(SELECT 1 FROM newsletter_deliveries WHERE campaign_id=$1 AND last_error='credits' AND status='pending') FROM newsletter_campaigns WHERE id=$1`, id).Scan(&result.ID, &result.Name, &result.Status, &result.ScheduledAt, &needsCredits)
	if needsCredits {
		result.LastError = "Email delivery is waiting for Sendy credits. Add credits to resume."
	}
	if result.Status == "suspended" {
		result.LastError = "One or more emails could not be sent. Review the sending account and failed email jobs in Sendy."
	}
	result.Recipients.ListIDs = []int64{1}
	return result, err
}
func (c *Client) FindCampaign(ctx context.Context, name string) (Campaign, error) {
	var id int64
	err := c.db.QueryRow(ctx, `SELECT id FROM newsletter_campaigns WHERE name=$1`, name).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return Campaign{}, nil
	}
	if err != nil {
		return Campaign{}, err
	}
	return c.GetCampaign(ctx, id)
}
func (c *Client) UpdateCampaign(ctx context.Context, id int64, payload map[string]any) error {
	if value, ok := payload["scheduledAt"].(string); ok {
		when, err := time.Parse(time.RFC3339, value)
		if err != nil {
			return err
		}
		result, err := c.db.Exec(ctx, `UPDATE newsletter_campaigns SET status='queued',scheduled_at=$1 WHERE id=$2 AND status='draft'`, when, id)
		if err == nil && result.RowsAffected() != 1 {
			return errors.New("campaign is no longer editable")
		}
		return err
	}
	subject, _ := payload["subject"].(string)
	body, _ := payload["htmlContent"].(string)
	sender, _ := payload["sender"].(Address)
	result, err := c.db.Exec(ctx, `UPDATE newsletter_campaigns SET subject=$1,html=$2,sender_email=$3,sender_name=$4 WHERE id=$5 AND status='draft'`, subject, body, sender.Email, sender.Name, id)
	if err == nil && result.RowsAffected() != 1 {
		return errors.New("campaign is no longer editable")
	}
	return err
}
func (c *Client) SendTestCampaign(ctx context.Context, id int64, email string) error {
	if email == "" {
		return errors.New("test recipient is not configured")
	}
	var subject, body string
	var sender Address
	err := c.db.QueryRow(ctx, `SELECT subject,html,sender_email,sender_name FROM newsletter_campaigns WHERE id=$1 AND status='draft'`, id).Scan(&subject, &body, &sender.Email, &sender.Name)
	if err != nil {
		return err
	}
	// Tests never change subscription state. The preview footer points at signup.
	body = strings.ReplaceAll(body, unsubscribePlaceholder, c.siteURL+"/subscribe")
	return c.Send(ctx, Email{Sender: sender, To: []Address{{Email: email}}, Subject: subject, HTML: body, IdempotencyKey: "test/" + c.token("test", subject+body, email)})
}
func (c *Client) SendCampaign(ctx context.Context, id int64) error {
	result, err := c.db.Exec(ctx, `UPDATE newsletter_campaigns SET status='queued',scheduled_at=NOW() WHERE id=$1 AND status='draft'`, id)
	if err == nil && result.RowsAffected() != 1 {
		return errors.New("campaign has already been submitted")
	}
	return err
}
func (c *Client) SetCampaignStatus(ctx context.Context, id int64, status string) error {
	if status != "draft" {
		return errors.New("unsupported campaign status")
	}
	result, err := c.db.Exec(ctx, `UPDATE newsletter_campaigns SET status='draft',scheduled_at=NULL WHERE id=$1 AND status='queued' AND scheduled_at>NOW()`, id)
	if err == nil && result.RowsAffected() != 1 {
		return errors.New("campaign has started sending")
	}
	return err
}
func (c *Client) CampaignAudience(ctx context.Context, _ int64) (int, error) {
	var count int
	err := c.db.QueryRow(ctx, `SELECT COUNT(*) FROM newsletter_subscribers WHERE status='subscribed'`).Scan(&count)
	return count, err
}

// ProcessQueue advances a bounded number of deliveries. Row locks serialize
// workers, and stable per-recipient keys survive HTTP timeouts and process death.
// The campaign snapshot and content remain immutable after submission.
func (c *Client) ProcessQueue(ctx context.Context) error {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	rows, err := tx.Query(ctx, `SELECT id FROM newsletter_campaigns WHERE status='queued' AND scheduled_at<=NOW() FOR UPDATE SKIP LOCKED LIMIT 10`)
	if err != nil {
		return err
	}
	var ids []int64
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	rows.Close()
	if rows.Err() != nil {
		return rows.Err()
	}
	for _, id := range ids {
		var body string
		if err = tx.QueryRow(ctx, `SELECT html FROM newsletter_campaigns WHERE id=$1`, id).Scan(&body); err != nil {
			return err
		}
		members, err := tx.Query(ctx, `SELECT id::text FROM newsletter_subscribers WHERE status='subscribed'`)
		if err != nil {
			return err
		}
		var subscribers []string
		for members.Next() {
			var member string
			if err = members.Scan(&member); err != nil {
				members.Close()
				return err
			}
			subscribers = append(subscribers, member)
		}
		members.Close()
		if members.Err() != nil {
			return members.Err()
		}
		for _, member := range subscribers {
			html := strings.ReplaceAll(body, unsubscribePlaceholder, c.link("unsubscribe", member, c.token("unsubscribe", member, "")))
			if _, err = tx.Exec(ctx, `INSERT INTO newsletter_deliveries(campaign_id,subscriber_id,html) VALUES($1,$2::text::uuid,$3) ON CONFLICT DO NOTHING`, id, member, html); err != nil {
				return err
			}
		}
		if _, err = tx.Exec(ctx, `UPDATE newsletter_campaigns SET status='in_process' WHERE id=$1`, id); err != nil {
			return err
		}
	}
	if err = tx.Commit(ctx); err != nil {
		return err
	}
	for range 50 {
		processed, err := c.processDelivery(ctx)
		if err != nil {
			return err
		}
		if !processed {
			break
		}
	}
	// "sent" means provider acceptance for all attempted recipients, never inbox
	// delivery. Any terminal failure keeps the broadcast out of the sent state.
	_, err = c.db.Exec(ctx, `UPDATE newsletter_campaigns c SET status=CASE WHEN EXISTS(SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id=c.id AND d.status='failed') THEN 'suspended' ELSE 'sent' END WHERE c.status='in_process' AND NOT EXISTS(SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id=c.id AND d.status NOT IN ('accepted','failed','skipped'))`)
	return err
}
func (c *Client) processDelivery(ctx context.Context) (bool, error) {
	tx, err := c.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)
	var campaignID int64
	var id, email, subscription, jobID, previousStatus, subject, body, deliveryStatus, lastError string
	var sender Address
	err = tx.QueryRow(ctx, `SELECT d.campaign_id,d.subscriber_id::text,s.email,s.status,d.job_id,d.status,c.subject,d.html,c.sender_email,c.sender_name FROM newsletter_deliveries d JOIN newsletter_subscribers s ON s.id=d.subscriber_id JOIN newsletter_campaigns c ON c.id=d.campaign_id WHERE ((c.status='in_process' AND d.status IN ('pending','queued','processing')) OR (d.status='accepted' AND d.delivery_status NOT IN ('bounced','complaint','rejected'))) AND d.next_attempt_at<=NOW() ORDER BY d.next_attempt_at FOR UPDATE OF d,s SKIP LOCKED LIMIT 1`).Scan(&campaignID, &id, &email, &subscription, &jobID, &previousStatus, &subject, &body, &sender.Email, &sender.Name)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	status := "skipped"
	if subscription == "subscribed" || jobID != "" {
		var job Job
		if jobID == "" {
			job, err = c.Submit(ctx, Email{Sender: sender, To: []Address{{Email: email}}, Subject: subject, HTML: body, IdempotencyKey: deliveryKey(campaignID, id)})
		} else {
			job, err = c.GetJob(ctx, jobID)
		}
		status = "pending"
		if jobID != "" {
			status = previousStatus
		}
		if err == nil {
			jobID, status = job.ID, job.Attributes.Status
			deliveryStatus = job.Attributes.DeliveryStatus
			if job.Attributes.DeliveryStatus == "bounced" || job.Attributes.DeliveryStatus == "complaint" || job.Attributes.LastError == "recipient_suppressed" {
				if _, e := tx.Exec(ctx, `UPDATE newsletter_subscribers SET status='suppressed',updated_at=NOW() WHERE id=$1::text::uuid`, id); e != nil {
					return false, e
				}
			}
		} else {
			var apiError *APIError
			if errors.As(err, &apiError) && apiError.Status >= 400 && apiError.Status < 500 && apiError.Status != 402 && apiError.Status != 429 {
				if jobID == "" || apiError.Status == 404 {
					status = "failed"
				}
			}
			if errors.As(err, &apiError) && apiError.Status == 402 {
				lastError = "credits"
			}
			// Credits, temporary service failures and uncertain submissions retry with
			// the exact same payload/key. No raw provider details enter storage/logs.
		}
	}
	_, err = tx.Exec(ctx, `UPDATE newsletter_deliveries SET job_id=$1,status=$2,delivery_status=$3,last_error=$4,next_attempt_at=NOW()+CASE WHEN $2='accepted' THEN INTERVAL '1 hour' ELSE INTERVAL '1 minute' END WHERE campaign_id=$5 AND subscriber_id=$6::text::uuid`, jobID, status, deliveryStatus, lastError, campaignID, id)
	if err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}

func deliveryKey(campaignID int64, subscriberID string) string {
	return "newsletter/" + strconv.FormatInt(campaignID, 10) + "/" + subscriberID
}
