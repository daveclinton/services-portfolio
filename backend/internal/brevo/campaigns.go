package brevo

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"
)

type Campaign struct {
	ID          int64      `json:"id"`
	Name        string     `json:"name"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduledAt"`
	Recipients  struct {
		ListIDs []int64 `json:"listIds"`
	} `json:"recipients"`
}

func (c *Client) CreateCampaign(ctx context.Context, name, subject, body string, sender Address, listID int64) (int64, error) {
	var response struct {
		ID int64 `json:"id"`
	}
	err := c.request(ctx, http.MethodPost, "/emailCampaigns", map[string]any{
		"name": name, "subject": subject, "sender": sender, "replyTo": sender.Email, "htmlContent": body,
		"recipients": map[string]any{"listIds": []int64{listID}}, "tag": "portfolio-newsletter",
	}, &response)
	if err == nil && response.ID < 1 {
		err = errors.New("brevo campaign creation returned no ID")
	}
	return response.ID, err
}

func (c *Client) UpdateCampaign(ctx context.Context, id int64, payload map[string]any) error {
	return c.request(ctx, http.MethodPut, fmt.Sprintf("/emailCampaigns/%d", id), payload, nil)
}
func (c *Client) GetCampaign(ctx context.Context, id int64) (Campaign, error) {
	var campaign Campaign
	err := c.request(ctx, http.MethodGet, fmt.Sprintf("/emailCampaigns/%d", id), nil, &campaign)
	if err == nil && (campaign.ID != id || campaign.Name == "" || campaign.Status == "") {
		err = errors.New("brevo returned incomplete campaign status")
	}
	return campaign, err
}

// Recover creation after an uncertain network response without creating another campaign.
func (c *Client) FindCampaign(ctx context.Context, name string) (Campaign, error) {
	var found Campaign
	for offset := 0; offset < 1000; offset += 100 {
		var response struct {
			Campaigns []Campaign `json:"campaigns"`
		}
		if err := c.request(ctx, http.MethodGet, fmt.Sprintf("/emailCampaigns?limit=100&offset=%d", offset), nil, &response); err != nil {
			return found, err
		}
		for _, campaign := range response.Campaigns {
			if campaign.Name == name {
				if found.ID != 0 {
					return Campaign{}, errors.New("multiple campaigns match this draft; review in Brevo")
				}
				found = campaign
			}
		}
		if len(response.Campaigns) < 100 {
			return found, nil
		}
	}
	return Campaign{}, errors.New("campaign recovery lookup exceeded its limit")
}
func (c *Client) SendTestCampaign(ctx context.Context, id int64, email string) error {
	if email == "" {
		return errors.New("test recipient is not configured")
	}
	return c.request(ctx, http.MethodPost, fmt.Sprintf("/emailCampaigns/%d/sendTest", id), map[string]any{"emailTo": []string{email}}, nil)
}
func (c *Client) SendCampaign(ctx context.Context, id int64) error {
	return c.request(ctx, http.MethodPost, fmt.Sprintf("/emailCampaigns/%d/sendNow", id), map[string]any{}, nil)
}
func (c *Client) SetCampaignStatus(ctx context.Context, id int64, status string) error {
	return c.request(ctx, http.MethodPut, fmt.Sprintf("/emailCampaigns/%d/status", id), map[string]any{"status": status}, nil)
}
func (c *Client) CampaignAudience(ctx context.Context, id int64) (int, error) {
	var response struct {
		ID    int64 `json:"id"`
		Count *int  `json:"totalSubscribers"`
	}
	err := c.request(ctx, http.MethodGet, fmt.Sprintf("/contacts/lists/%d", id), nil, &response)
	if err == nil && (response.ID != id || response.Count == nil || *response.Count < 0) {
		err = errors.New("subscriber count is unavailable")
	}
	if err != nil {
		return 0, err
	}
	return *response.Count, nil
}
