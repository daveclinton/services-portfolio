package brevo

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func TestCampaignAdapterUsesCampaignEndpointsAndExplicitTestRecipient(t *testing.T) {
	client := New("fake-key")
	calls := 0
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		if r.Header.Get("api-key") != "fake-key" {
			t.Fatal("provider credentials missing")
		}
		var body map[string]any
		if r.Method != "GET" {
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				t.Fatal(err)
			}
		}
		switch r.URL.Path {
		case "/v3/emailCampaigns":
			if r.Method == "GET" {
				return providerResponse(200, map[string]any{"campaigns": []any{map[string]any{"id": 41, "name": "portfolio-newsletter/test", "status": "draft"}}}), nil
			}
			if body["scheduledAt"] != nil || body["subject"] != "Subject" || body["htmlContent"] != "<p>Body</p>" || body["tag"] != "portfolio-newsletter" {
				t.Fatal("draft creation content/schedule is incorrect")
			}
			recipients := body["recipients"].(map[string]any)["listIds"].([]any)
			if len(recipients) != 1 || recipients[0] != float64(2) {
				t.Fatal("wrong campaign audience")
			}
			return providerResponse(201, map[string]any{"id": 41}), nil
		case "/v3/emailCampaigns/41/sendTest":
			to := body["emailTo"].([]any)
			if len(to) != 1 || to[0] != "owner@example.com" {
				t.Fatal("test sent to an implicit list")
			}
		case "/v3/emailCampaigns/41/sendNow":
			if r.Method != "POST" {
				t.Fatal("wrong send method")
			}
		case "/v3/emailCampaigns/41/status":
			if body["status"] != "draft" || r.Method != "PUT" {
				t.Fatal("wrong cancellation request")
			}
		case "/v3/emailCampaigns/41":
			if r.Method == "GET" {
				return providerResponse(200, map[string]any{"id": 41, "name": "portfolio-newsletter/test", "status": "draft"}), nil
			}
			if r.Method != "PUT" || body["subject"] != "Updated" {
				t.Fatal("wrong update request")
			}
		case "/v3/contacts/lists/2":
			return providerResponse(200, map[string]any{"id": 2, "totalSubscribers": 0}), nil
		default:
			t.Fatalf("unexpected campaign endpoint %s", r.URL.Path)
		}
		return providerResponse(204, nil), nil
	})
	ctx := context.Background()
	if id, err := client.CreateCampaign(ctx, "portfolio-newsletter/test", "Subject", "<p>Body</p>", Address{Email: "david@example.com"}, 2); err != nil || id != 41 {
		t.Fatal("campaign create failed", err)
	}
	if err := client.SendTestCampaign(ctx, 41, ""); err == nil || calls != 1 {
		t.Fatal("empty test destination reached provider")
	}
	for _, err := range []error{client.UpdateCampaign(ctx, 41, map[string]any{"subject": "Updated"}), client.SendTestCampaign(ctx, 41, "owner@example.com"), client.SendCampaign(ctx, 41), client.SetCampaignStatus(ctx, 41, "draft")} {
		if err != nil {
			t.Fatal(err)
		}
	}
	if c, err := client.GetCampaign(ctx, 41); err != nil || c.Status != "draft" {
		t.Fatal(err)
	}
	if c, err := client.FindCampaign(ctx, "portfolio-newsletter/test"); err != nil || c.ID != 41 {
		t.Fatal(err)
	}
	if count, err := client.CampaignAudience(ctx, 2); err != nil || count != 0 {
		t.Fatal("zero subscriber count lost", err)
	}
}

func TestCampaignAdapterRejectsIncompleteProviderSuccess(t *testing.T) {
	client := New("fake")
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) { return providerResponse(200, map[string]any{}), nil })
	ctx := context.Background()
	if _, err := client.CreateCampaign(ctx, "name", "Subject", "Body", Address{}, 2); err == nil {
		t.Fatal("missing campaign ID accepted")
	}
	if _, err := client.GetCampaign(ctx, 41); err == nil {
		t.Fatal("missing campaign status accepted")
	}
	if _, err := client.CampaignAudience(ctx, 2); err == nil {
		t.Fatal("missing count claimed zero subscribers")
	}
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		return providerResponse(401, map[string]any{"code": "unauthorized", "message": "private owner@example.com"}), nil
	})
	if _, err := client.GetCampaign(ctx, 41); err == nil || strings.Contains(err.Error(), "owner@example.com") {
		t.Fatal("provider error leaked private data or disappeared")
	}
}
