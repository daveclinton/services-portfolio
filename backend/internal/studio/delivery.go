package studio

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/sendy"
	"github.com/jackc/pgx/v5/pgxpool"
)

func campaignName(id string) string { return "portfolio-newsletter/" + id }

// The session lock serializes owner actions. The committed operation column
// survives process death, preventing a lost provider response from enabling a resend.
func (s *Service) lockDraft(w http.ResponseWriter, r *http.Request) (*pgxpool.Conn, Draft, func(), bool) {
	id := r.PathValue("id")
	if !httpx.IsUUID(id) {
		httpx.WriteJSON(w, 404, httpx.Problem{Detail: "Newsletter not found."})
		return nil, Draft{}, nil, false
	}
	conn, err := s.db.Acquire(r.Context())
	if err != nil {
		draftFailure(w, err)
		return nil, Draft{}, nil, false
	}
	var locked bool
	err = conn.QueryRow(r.Context(), `SELECT pg_try_advisory_lock(hashtextextended($1,0))`, id).Scan(&locked)
	if err != nil || !locked {
		conn.Release()
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "Another action is still running. Check status shortly."})
		return nil, Draft{}, nil, false
	}
	release := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		var unlocked bool
		if err := conn.QueryRow(ctx, `SELECT pg_advisory_unlock(hashtextextended($1,0))`, id).Scan(&unlocked); err != nil || !unlocked {
			_ = conn.Hijack().Close(ctx)
		} else {
			conn.Release()
		}
	}
	draft, err := scanDraft(conn.QueryRow(r.Context(), `SELECT `+draftColumns+` FROM newsletter_studio_drafts WHERE id=$1::text::uuid`, id))
	if err != nil {
		release()
		draftFailure(w, err)
		return nil, Draft{}, nil, false
	}
	if draft.DeliveryProvider != "sendy" {
		release()
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This newsletter belongs to the previous email provider. Review its status there and cancel any outstanding schedule before creating a new newsletter."})
		return nil, Draft{}, nil, false
	}
	return conn, draft, release, true
}

func record(conn *pgxpool.Conn, d *Draft, state, operation, message string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	updated, err := scanDraft(conn.QueryRow(ctx, `UPDATE newsletter_studio_drafts SET state=$1,operation=$2,last_error=$3,campaign_id=$4,scheduled_at=$5,tested_revision=$6,updated_at=NOW() WHERE id=$7::text::uuid RETURNING `+draftColumns, state, operation, message, d.CampaignID, d.ScheduledAt, d.TestedRevision, d.ID))
	if err == nil {
		*d = updated
	}
	return err
}

func campaignState(c sendy.Campaign) string {
	switch c.Status {
	case "draft":
		return "draft"
	case "sent":
		return "sent"
	case "queued":
		if c.ScheduledAt != nil && c.ScheduledAt.After(time.Now()) {
			return "scheduled"
		}
		return "sending"
	case "in_process", "in_review", "cancelling":
		return "sending"
	case "suspended", "cancelled", "archive":
		return "stopped"
	default:
		return "checking"
	}
}

func (s *Service) refresh(w http.ResponseWriter, r *http.Request) {
	if _, ok := readInput(w, r); !ok {
		return
	}
	conn, d, release, ok := s.lockDraft(w, r)
	if !ok {
		return
	}
	defer release()
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	var campaign sendy.Campaign
	var err error
	if d.CampaignID == 0 && d.Operation != "" {
		campaign, err = s.mail.FindCampaign(ctx, campaignName(d.ID))
		if err == nil && campaign.ID == 0 {
			httpx.WriteJSON(w, 409, httpx.Problem{Detail: "Campaign creation is unconfirmed. Review it in the newsletter dashboard before trying another send."})
			return
		}
		d.CampaignID = campaign.ID
	} else if d.CampaignID > 0 {
		campaign, err = s.mail.GetCampaign(ctx, d.CampaignID)
	} else {
		httpx.WriteJSON(w, 200, d)
		return
	}
	if err != nil || campaign.Name != campaignName(d.ID) {
		httpx.Unavailable(w, "Could not confirm delivery status. Please check again shortly.", 30)
		return
	}
	state := campaignState(campaign)
	operation := ""
	message := campaign.LastError
	if state == "checking" {
		operation = d.Operation
		message = "Delivery status needs review."
	}
	if state == "draft" && (d.Operation == "send" || d.Operation == "schedule") {
		message = "The send is unconfirmed. Check delivery status before trying again."
		state = "checking"
		operation = d.Operation
	}
	if d.Operation == "test" {
		message = "Check your inbox before sending another test."
	}
	d.ScheduledAt = campaign.ScheduledAt
	if state == "draft" {
		d.ScheduledAt = nil
	}
	if err = record(conn, &d, state, operation, message); err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, d)
}

func (s *Service) campaignAction(w http.ResponseWriter, r *http.Request) {
	body, ok := readInput(w, r)
	if !ok {
		return
	}
	action := r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:]
	conn, d, release, ok := s.lockDraft(w, r)
	if !ok {
		return
	}
	defer release()
	if d.Kind != "newsletter" {
		httpx.BadRequest(w, "Create a newsletter from the published post before sending.", nil)
		return
	}
	if d.Revision != revisionOf(body) || d.Operation != "" {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This newsletter changed or its last action needs a status check."})
		return
	}
	if action == "cancel" {
		if d.State != "scheduled" || d.CampaignID == 0 {
			httpx.BadRequest(w, "Only a scheduled newsletter can be returned to drafts.", nil)
			return
		}
		s.cancelSchedule(w, r, conn, &d)
		return
	}
	if d.State != "draft" && d.State != "error" {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "This newsletter has already been submitted for delivery."})
		return
	}
	if action == "test" && s.cfg.NewsletterTestEmail == "" {
		httpx.BadRequest(w, "A test recipient must be configured before sending a test.", nil)
		return
	}
	var scheduled *time.Time
	if action == "schedule" {
		value, _ := body["scheduled_at"].(string)
		when, err := time.Parse(time.RFC3339, value)
		if err != nil || !when.After(time.Now().Add(time.Minute)) {
			httpx.BadRequest(w, "Choose a time at least a minute in the future.", nil)
			return
		}
		scheduled = &when
	}
	html, err := sendy.RenderNewsletter(d.Subject, d.Markdown, s.cfg.SiteURL)
	if err != nil {
		httpx.BadRequest(w, err.Error(), nil)
		return
	}
	ids, ready := s.listIDs()
	if !ready || s.cfg.SendySenderEmail == "" {
		httpx.Unavailable(w, "Newsletter delivery is not ready yet.", 60)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 24*time.Second)
	defer cancel()
	if err = record(conn, &d, "checking", "prepare", ""); err != nil {
		draftFailure(w, err)
		return
	}
	fail := func(err error, operation string) {
		// An HTTP 4xx is a definitive refusal; transport/5xx outcomes need
		// reconciliation, never a blind automatic retry of a broadcast.
		var apiError *sendy.APIError
		state, op, message := "checking", operation, "The result is unconfirmed. Check delivery status before continuing."
		if errors.As(err, &apiError) && apiError.Status >= 400 && apiError.Status < 500 {
			state, op, message = "error", "", "Sendy declined this request. Check the campaign, sender and account limits, then try again."
			if apiError.Status == 402 {
				message = "Sendy reports insufficient sending credits. Check your account before retrying."
			}
		}
		if e := record(conn, &d, state, op, message); e != nil {
			draftFailure(w, e)
			return
		}
		httpx.WriteJSON(w, 200, d)
	}
	if d.CampaignID == 0 {
		id, e := s.mail.CreateCampaign(ctx, campaignName(d.ID), d.Subject, html, sendy.Address{Name: s.cfg.SendySenderName, Email: s.cfg.SendySenderEmail}, ids.ListID)
		if e != nil {
			fail(e, "prepare")
			return
		}
		d.CampaignID = id
		if err = record(conn, &d, "checking", "prepare", ""); err != nil {
			draftFailure(w, err)
			return
		}
	} else {
		current, e := s.mail.GetCampaign(ctx, d.CampaignID)
		if e != nil {
			fail(e, "prepare")
			return
		}
		if current.Name != campaignName(d.ID) || current.Status != "draft" {
			state := campaignState(current)
			if current.Name != campaignName(d.ID) {
				state = "checking"
			}
			if err = record(conn, &d, state, "review", "Delivery status changed. Review the newsletter delivery status."); err != nil {
				draftFailure(w, err)
				return
			}
			httpx.WriteJSON(w, 200, d)
			return
		}
		payload := map[string]any{"subject": d.Subject, "htmlContent": html, "sender": sendy.Address{Name: s.cfg.SendySenderName, Email: s.cfg.SendySenderEmail}, "replyTo": s.cfg.SendySenderEmail, "recipients": map[string]any{"listIds": []int64{ids.ListID}}}
		if e = s.mail.UpdateCampaign(ctx, d.CampaignID, payload); e != nil {
			fail(e, "prepare")
			return
		}
	}
	// The campaign always carries the draft's current choice, so a send can
	// never reach a wider audience than the one confirmed on screen.
	if e := s.mail.SetCampaignRecipients(ctx, d.CampaignID, d.Recipients); e != nil {
		fail(e, "prepare")
		return
	}
	if err = record(conn, &d, "checking", action, ""); err != nil {
		draftFailure(w, err)
		return
	}
	switch action {
	case "test":
		err = s.mail.SendTestCampaign(ctx, d.CampaignID, s.cfg.NewsletterTestEmail)
		if err != nil {
			fail(err, "test")
			return
		}
		d.TestedRevision = d.Revision
		err = record(conn, &d, "draft", "", "")
	case "send":
		err = s.mail.SendCampaign(ctx, d.CampaignID)
		if err != nil {
			fail(err, "send")
			return
		}
		err = record(conn, &d, "sending", "", "")
	case "schedule":
		err = s.mail.UpdateCampaign(ctx, d.CampaignID, map[string]any{"scheduledAt": scheduled.Format(time.RFC3339)})
		if err != nil {
			fail(err, "schedule")
			return
		}
		d.ScheduledAt = scheduled
		err = record(conn, &d, "scheduled", "", "")
	default:
		err = fmt.Errorf("unsupported campaign action")
	}
	if err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, d)
}

func (s *Service) cancelSchedule(w http.ResponseWriter, r *http.Request, conn *pgxpool.Conn, d *Draft) {
	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()
	current, err := s.mail.GetCampaign(ctx, d.CampaignID)
	if err != nil || current.Name != campaignName(d.ID) || campaignState(current) != "scheduled" {
		httpx.WriteJSON(w, 409, httpx.Problem{Detail: "The schedule changed or sending has started. Check delivery status."})
		return
	}
	if err = record(conn, d, "checking", "cancel", ""); err != nil {
		draftFailure(w, err)
		return
	}
	if err = s.mail.SetCampaignStatus(ctx, d.CampaignID, "draft"); err != nil {
		httpx.WriteJSON(w, 200, *d)
		return
	}
	// Verify the provider actually removed the queue before allowing edits.
	current, err = s.mail.GetCampaign(ctx, d.CampaignID)
	if err != nil || current.Status != "draft" {
		httpx.WriteJSON(w, 200, *d)
		return
	}
	d.ScheduledAt = nil
	if err = record(conn, d, "draft", "", ""); err != nil {
		draftFailure(w, err)
		return
	}
	httpx.WriteJSON(w, 200, *d)
}
