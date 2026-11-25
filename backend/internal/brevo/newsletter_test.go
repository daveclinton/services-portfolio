package brevo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

func providerResponse(status int, value any) *http.Response {
	data, _ := json.Marshal(value)
	return &http.Response{StatusCode: status, Body: io.NopCloser(strings.NewReader(string(data))), Header: http.Header{}}
}

func TestNewsletterProvisioningIsRepeatableAndNeverEnrollsOrEmailsContacts(t *testing.T) {
	client := New("test-key")
	resources := map[string][]map[string]any{"folders": {}, "lists": {}, "templates": {}}
	var templateBody map[string]any
	creates, updates := 0, 0
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Header.Get("api-key") != "test-key" {
			t.Fatal("missing provider authentication")
		}
		if r.URL.Path == "/v3/smtp/email" || r.URL.Path == "/v3/contacts/doubleOptinConfirmation" {
			t.Fatal("provisioning sent email")
		}
		if r.Method == http.MethodGet {
			if r.URL.Path == "/v3/smtp/templates/3" {
				return providerResponse(200, templateBody), nil
			}
			for _, field := range []string{"folders", "lists", "templates"} {
				if strings.HasSuffix(r.URL.Path, "/"+field) {
					if len(resources[field]) == 0 {
						if field == "templates" {
							// Observed on the VPS: an empty template list is HTTP 200 {}.
							return providerResponse(200, map[string]any{}), nil
						}
						return providerResponse(200, map[string]any{"count": 0}), nil
					}
					return providerResponse(200, map[string]any{"count": len(resources[field]), field: resources[field]}), nil
				}
			}
		}
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if r.Method == http.MethodPut {
			updates++
			templateBody = body
			return providerResponse(204, nil), nil
		}
		for index, field := range []string{"folders", "lists", "templates"} {
			if r.Method == http.MethodPost && strings.HasSuffix(r.URL.Path, "/"+field) {
				creates++
				name := body["name"]
				if field == "templates" {
					name = body["templateName"]
					templateBody = body
				}
				resources[field] = append(resources[field], map[string]any{"id": index + 1, "name": name})
				return providerResponse(201, map[string]int{"id": index + 1}), nil
			}
		}
		t.Fatalf("unexpected provider call: %s %s", r.Method, r.URL.Path)
		return nil, nil
	})
	sender := Address{Name: "David Clinton", Email: "notes@example.com"}
	first, err := client.EnsureNewsletter(context.Background(), sender, "https://example.com")
	if err != nil || first.ListID != 2 || first.TemplateID != 3 {
		t.Fatalf("provision: %+v %v", first, err)
	}
	second, err := client.EnsureNewsletter(context.Background(), sender, "https://example.com")
	if err != nil || first != second || creates != 3 || updates != 0 {
		t.Fatalf("resources were recreated or rewritten: %+v creates=%d updates=%d err=%v", second, creates, updates, err)
	}
	if !strings.Contains(templateBody["htmlContent"].(string), `href="{{ params.DOIurl }}"`) {
		t.Fatal("confirmation token was escaped or lost")
	}
	if _, err := client.EnsureNewsletter(context.Background(), sender, "https://changed.example.com"); err != nil || updates != 1 {
		t.Fatal("own template was not updated when the site changed", err)
	}
}

func TestResourceLookupChecksLaterPagesBeforeCreatingAnything(t *testing.T) {
	client := New("key")
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodGet {
			t.Fatal("lookup mutated resources")
		}
		entries := []map[string]any{}
		if r.URL.Query().Get("offset") == "0" {
			for index := range 50 {
				entries = append(entries, map[string]any{"id": index + 1, "name": fmt.Sprintf("Other %d", index)})
			}
		} else {
			entries = append(entries, map[string]any{"id": 99, "name": newsletterList})
		}
		return providerResponse(200, map[string]any{"lists": entries}), nil
	})
	id, err := client.findNamed(context.Background(), "/contacts/lists", "lists", newsletterList)
	if err != nil || id != 99 {
		t.Fatalf("later resource lost: %d %v", id, err)
	}
}

func TestResourceLookupAcceptsOmittedCollectionsOnlyWhenCountIsZero(t *testing.T) {
	for _, resource := range []struct{ path, field string }{
		{"/contacts/folders", "folders"},
		{"/contacts/lists", "lists"},
		{"/smtp/templates", "templates"},
	} {
		t.Run(resource.field, func(t *testing.T) {
			for _, body := range []string{`{"count":0}`, `{"count":0,"` + resource.field + `":null}`, `{"count":0,"` + resource.field + `":[]}`} {
				client := New("key")
				client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
					if r.Method != http.MethodGet {
						t.Fatal("lookup mutated provider resources")
					}
					return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}, nil
				})
				id, err := client.findNamed(context.Background(), resource.path, resource.field, "portfolio")
				if err != nil || id != 0 {
					t.Fatalf("empty collection %s: id=%d err=%v", body, id, err)
				}
			}
		})
	}
}

func TestEmptyObjectIsAcceptedOnlyForTheObservedTemplateListEndpoint(t *testing.T) {
	for _, resource := range []struct{ path, field string }{
		{"/smtp/templates", "templates"},
		{"/contacts/folders", "folders"},
		{"/contacts/lists", "lists"},
	} {
		t.Run(resource.field, func(t *testing.T) {
			client := New("key")
			client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
				if r.Method != http.MethodGet {
					t.Fatal("lookup mutated provider resources")
				}
				return providerResponse(200, map[string]any{}), nil
			})
			id, err := client.findNamed(context.Background(), resource.path, resource.field, "portfolio")
			if resource.field == "templates" {
				if id != 0 || err != nil {
					t.Fatalf("observed empty template list rejected: id=%d err=%v", id, err)
				}
			} else if err == nil {
				t.Fatal("empty object from another endpoint was silently accepted")
			}
		})
	}
}

func TestMalformedResourceCollectionsRemainErrorsWithEndpointContext(t *testing.T) {
	for _, body := range []string{`null`, `{"unexpected":true}`, `{"count":null}`, `{"count":-1}`, `{"count":1}`, `{"count":1,"templates":null}`, `{"templates":{}}`, `{"templates":`} {
		client := New("key")
		client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
			if r.Method != http.MethodGet {
				t.Fatal("malformed response caused a mutation")
			}
			return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body)), Header: http.Header{}}, nil
		})
		_, err := client.findNamed(context.Background(), "/smtp/templates", "templates", confirmationTemplate)
		if err == nil || !strings.Contains(err.Error(), "/smtp/templates") {
			t.Fatalf("malformed response %s should fail with endpoint context: %v", body, err)
		}
	}
}

func TestSubscriptionRequestsUseDOIAndHideProviderPersonalData(t *testing.T) {
	client := New("key")
	status := 201
	code := ""
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method == http.MethodGet && r.URL.Path == "/v3/contacts/visitor@example.com" {
			return providerResponse(404, map[string]string{"code": "document_not_found"}), nil
		}
		if r.URL.Path != "/v3/contacts/doubleOptinConfirmation" {
			t.Fatal("contact was enrolled without DOI")
		}
		var body struct {
			Email    string  `json:"email"`
			Lists    []int64 `json:"includeListIds"`
			Template int64   `json:"templateId"`
			Redirect string  `json:"redirectionUrl"`
			Tracking bool    `json:"contactPixelTrackingConsent"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatal(err)
		}
		if body.Email != "visitor@example.com" || len(body.Lists) != 1 || body.Lists[0] != 2 || body.Template != 3 || body.Tracking || body.Redirect != "https://example.com/subscribe/confirmed" {
			t.Fatalf("wrong DOI contract: %+v", body)
		}
		return providerResponse(status, map[string]any{"code": code, "message": "private visitor@example.com details"}), nil
	})
	send := func() error {
		result, err := client.RequestSubscription(context.Background(), "visitor@example.com", NewsletterIDs{2, 3}, "https://example.com/subscribe/confirmed", true)
		if err == nil && result != SubscriptionPending {
			t.Fatal("DOI response claimed confirmed membership", result)
		}
		return err
	}
	if err := send(); err != nil {
		t.Fatal(err)
	}
	status, code = 400, "duplicate_parameter"
	if err := send(); err != nil {
		t.Fatal("duplicate request leaked existing membership", err)
	}
	status, code = 401, "unauthorized"
	if err := send(); err == nil || strings.Contains(err.Error(), "visitor@example.com") {
		t.Fatal("provider error was hidden or leaked personal data", err)
	}
}

func TestSubscriptionSkipsConfirmedAndSuppressedContactsButConfirmsOtherContacts(t *testing.T) {
	for _, tc := range []struct {
		name                string
		status              int
		contact             any
		wantStatus          SubscriptionStatus
		wantSend, wantError bool
	}{
		{"new contact", 404, map[string]any{"code": "document_not_found"}, SubscriptionPending, true, false},
		{"other list", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{7}}, SubscriptionPending, true, false},
		{"no lists", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{}}, SubscriptionPending, true, false},
		{"confirmed newsletter", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{2}}, SubscriptionSubscribed, false, false},
		{"blocked member", 200, map[string]any{"id": 1, "emailBlacklisted": true, "listIds": []int{2}}, SubscriptionSuppressed, false, false},
		{"blocked nonmember", 200, map[string]any{"id": 1, "emailBlacklisted": true, "listIds": []int{}}, SubscriptionSuppressed, false, false},
		{"unsubscribed newsletter", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{2}, "listUnsubscribed": []int{2}}, SubscriptionSuppressed, false, false},
		{"removed unsubscribed newsletter", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{}, "listUnsubscribed": []int{2}}, SubscriptionSuppressed, false, false},
		{"unsubscribed other list", 200, map[string]any{"id": 1, "emailBlacklisted": false, "listIds": []int{7}, "listUnsubscribed": []int{7}}, SubscriptionPending, true, false},
		{"lookup unauthorized", 401, map[string]any{"code": "unauthorized", "message": "private reader@example.com"}, "", false, true},
		{"lookup unavailable", 503, map[string]any{"code": "unavailable"}, "", false, true},
		{"empty contact", 200, map[string]any{}, "", false, true},
		{"null contact", 200, nil, "", false, true},
		{"missing blocklist status", 200, map[string]any{"id": 1, "listIds": []int{2}}, "", false, true},
		{"invalid blocklist status", 200, map[string]any{"id": 1, "emailBlacklisted": "unknown"}, "", false, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, allowConfirmation := range []bool{true, false} {
				client := New("key")
				lookups, sends := 0, 0
				client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
					if r.Method == http.MethodGet && r.URL.Path == "/v3/contacts/reader@example.com" {
						lookups++
						if r.URL.Query().Get("identifierType") != "email_id" {
							t.Fatal("contact identifier type missing")
						}
						return providerResponse(tc.status, tc.contact), nil
					}
					if r.Method != http.MethodPost || r.URL.Path != "/v3/contacts/doubleOptinConfirmation" {
						t.Fatalf("unexpected contact mutation: %s %s", r.Method, r.URL.Path)
					}
					sends++
					return providerResponse(201, map[string]any{}), nil
				})
				result, err := client.RequestSubscription(context.Background(), "reader@example.com", NewsletterIDs{2, 3}, "https://example.com/subscribe/confirmed", allowConfirmation)
				if (err != nil) != tc.wantError || result != tc.wantStatus || lookups != 1 || (sends == 1) != (tc.wantSend && allowConfirmation) || sends > 1 {
					t.Fatalf("allowConfirmation=%t lookup=%d sends=%d result=%s err=%v", allowConfirmation, lookups, sends, result, err)
				}
				if err != nil && strings.Contains(err.Error(), "reader@example.com") {
					t.Fatal("contact lookup error leaked email")
				}
			}
		})
	}
}

func TestContactLookupEscapesEmailAndRedactsTransportErrors(t *testing.T) {
	client := New("key")
	email := "reader+tag/part?flag@example.com"
	client.http.Transport = mailTransport(func(r *http.Request) (*http.Response, error) {
		if r.Method != http.MethodGet || !strings.Contains(r.URL.EscapedPath(), "%2F") || !strings.Contains(r.URL.EscapedPath(), "%3F") || r.URL.RawQuery != "identifierType=email_id" {
			t.Fatal("email altered the provider URL structure")
		}
		return nil, errors.New("network failure containing private " + email)
	})
	_, err := client.RequestSubscription(context.Background(), email, NewsletterIDs{2, 3}, "https://example.com/subscribe/confirmed", true)
	if err == nil || strings.Contains(err.Error(), email) || strings.Contains(err.Error(), "/contacts/") {
		t.Fatal("transport error exposed contact URL or hid failure", err)
	}
}

func TestNoteEscapesVisitorTextAndKeepsTheProviderConfirmationPlaceholder(t *testing.T) {
	html, text, err := RenderNote(Note{Title: "Question", SiteURL: "https://example.com", Sections: []NoteSection{{Label: "They asked", Text: `<script>alert("bad")</script>`}}})
	if err != nil || strings.Contains(html, "<script>") || !strings.Contains(html, "&lt;script&gt;") || !strings.Contains(text, "They asked") {
		t.Fatal("unsafe or missing email content", err)
	}
	html, text, err = RenderNote(ConfirmationNote("https://example.com"))
	if err != nil || !strings.Contains(html, `href="{{ params.DOIurl }}"`) || !strings.Contains(text, "{{ params.DOIurl }}") || strings.Contains(html, "ZgotmplZ") {
		t.Fatal("invalid confirmation template", err)
	}
	if !strings.Contains(html, `<!--[if mso]>`) || !strings.Contains(html, `<!--[if mso]></td></tr></table><![endif]-->`) {
		t.Fatal("Outlook layout wrappers were stripped")
	}
}
