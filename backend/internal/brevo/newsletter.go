package brevo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
)

const newsletterFolder = "daveclintonn.cc portfolio"
const newsletterList = "daveclintonn.cc — Follow along"
const confirmationTemplate = "daveclintonn.cc — Confirm email"
const confirmationSubject = "Confirm your email · David Clinton"

type NewsletterIDs struct{ ListID, TemplateID int64 }

// Only resources with these application-owned names are created or updated.
// No contacts are imported and no email is sent during provisioning.
func (c *Client) EnsureNewsletter(ctx context.Context, sender Address, siteURL string) (NewsletterIDs, error) {
	var ids NewsletterIDs
	folderID, err := c.findNamed(ctx, "/contacts/folders", "folders", newsletterFolder)
	if err != nil {
		return ids, err
	}
	if folderID == 0 {
		var created struct {
			ID int64 `json:"id"`
		}
		if err := c.request(ctx, http.MethodPost, "/contacts/folders", map[string]any{"name": newsletterFolder}, &created); err != nil {
			return ids, err
		}
		folderID = created.ID
	}
	ids.ListID, err = c.findNamed(ctx, "/contacts/lists", "lists", newsletterList)
	if err != nil {
		return ids, err
	}
	if ids.ListID == 0 {
		var created struct {
			ID int64 `json:"id"`
		}
		if err := c.request(ctx, http.MethodPost, "/contacts/lists", map[string]any{"name": newsletterList, "folderId": folderID}, &created); err != nil {
			return ids, err
		}
		ids.ListID = created.ID
	}
	html, _, err := RenderNote(ConfirmationNote(siteURL))
	if err != nil {
		return ids, err
	}
	ids.TemplateID, err = c.findNamed(ctx, "/smtp/templates", "templates", confirmationTemplate)
	if err != nil {
		return ids, err
	}
	payload := map[string]any{"templateName": confirmationTemplate, "sender": sender, "subject": confirmationSubject, "htmlContent": html, "isActive": true, "tag": "optin"}
	if ids.TemplateID == 0 {
		var created struct {
			ID int64 `json:"id"`
		}
		if err := c.request(ctx, http.MethodPost, "/smtp/templates", payload, &created); err != nil {
			return ids, err
		}
		ids.TemplateID = created.ID
	} else {
		var current struct {
			HTML    string  `json:"htmlContent"`
			Subject string  `json:"subject"`
			Active  bool    `json:"isActive"`
			Sender  Address `json:"sender"`
		}
		path := fmt.Sprintf("/smtp/templates/%d", ids.TemplateID)
		if err := c.request(ctx, http.MethodGet, path, nil, &current); err != nil {
			return ids, err
		}
		if current.HTML != html || current.Subject != confirmationSubject || !current.Active || current.Sender != sender {
			if err := c.request(ctx, http.MethodPut, path, payload, nil); err != nil {
				return ids, err
			}
		}
	}
	if folderID < 1 || ids.ListID < 1 || ids.TemplateID < 1 {
		return ids, errors.New("brevo returned missing newsletter resource IDs")
	}
	return ids, nil
}

func (c *Client) findNamed(ctx context.Context, path, field, name string) (int64, error) {
	for offset := 0; offset < 5000; offset += 50 {
		var page map[string]json.RawMessage
		if err := c.request(ctx, http.MethodGet, fmt.Sprintf("%s?limit=50&offset=%d", path, offset), nil, &page); err != nil {
			return 0, fmt.Errorf("lookup newsletter %s: %w", path, err)
		}
		// The live templates endpoint returns HTTP 200 {} for an empty list.
		// Limit this exception to that exact object/endpoint; null and other
		// incomplete responses must still fail rather than create duplicates.
		if path == "/smtp/templates" && page != nil && len(page) == 0 {
			return 0, nil
		}
		collection := page[field]
		// Brevo's collection fields are optional. Empty accounts can return
		// only {"count":0}; don't unmarshal a missing RawMessage as JSON.
		// Require an explicit zero count so malformed responses can't trigger
		// duplicate resource creation by looking like an empty account.
		if len(collection) == 0 || string(collection) == "null" {
			var count *int
			if err := json.Unmarshal(page["count"], &count); err == nil && count != nil && *count == 0 {
				return 0, nil
			}
			return 0, fmt.Errorf("lookup newsletter %s: missing %s collection without a zero count", path, field)
		}
		var entries []struct {
			ID           int64  `json:"id"`
			Name         string `json:"name"`
			TemplateName string `json:"templateName"`
		}
		if err := json.Unmarshal(collection, &entries); err != nil {
			return 0, fmt.Errorf("decode newsletter %s collection: %w", path, err)
		}
		for _, entry := range entries {
			if entry.Name == name || entry.TemplateName == name {
				return entry.ID, nil
			}
		}
		if len(entries) < 50 {
			return 0, nil
		}
	}
	return 0, errors.New("newsletter resource lookup exceeded pagination limit")
}

func (c *Client) RequestSubscription(ctx context.Context, email string, ids NewsletterIDs, redirectURL string) error {
	err := c.request(ctx, http.MethodPost, "/contacts/doubleOptinConfirmation", map[string]any{
		"email": email, "includeListIds": []int64{ids.ListID}, "templateId": ids.TemplateID,
		"redirectionUrl": redirectURL, "contactPixelTrackingConsent": false,
	}, nil)
	var providerError *APIError
	if errors.As(err, &providerError) && providerError.Status == http.StatusBadRequest && (providerError.Code == "duplicate_parameter" || providerError.Code == "duplicate_request") {
		return nil
	}
	return err
}
