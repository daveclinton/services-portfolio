// Package sendy delivers email through usesendy.com's JSON:API.
package sendy

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/visitor"
	"github.com/jackc/pgx/v5/pgxpool"
)

const apiURL = "https://usesendy.com/api/v1"
const MediaType = "application/vnd.api+json"
const ContentLimit = 60000
const SubjectByteLimit = 255
const ConfirmationCooldown = 15 * time.Minute

type Client struct {
	apiKey             string
	http               *http.Client
	db                 *pgxpool.Pool
	sender             Address
	siteURL, publicURL string
	signer             visitor.Signer
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey, http: &http.Client{Timeout: 10 * time.Second}}
}

// NewNewsletter uses the application's database for consent and campaign state;
// Sendy itself only provides transactional delivery and job status.
func NewNewsletter(apiKey string, db *pgxpool.Pool, sender Address, siteURL, publicURL, secret string) *Client {
	c := New(apiKey)
	c.db, c.sender, c.siteURL, c.publicURL, c.signer = db, sender, siteURL, publicURL, visitor.NewSigner(secret)
	return c
}

type Address struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}
type Email struct {
	Sender                              Address
	To                                  []Address
	Subject, HTML, Text, IdempotencyKey string
}

type Job struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Attributes struct {
		Status         string `json:"status"`
		DeliveryStatus string `json:"delivery_status"`
		LastError      string `json:"last_error"`
	} `json:"attributes"`
}

func (c *Client) Send(ctx context.Context, email Email) error {
	job, err := c.Submit(ctx, email)
	if err == nil && job.Attributes.Status == "failed" {
		return errors.New("Sendy job failed; review its status before sending another email")
	}
	return err
}

func (c *Client) Submit(ctx context.Context, email Email) (Job, error) {
	var job Job
	if len(email.To) != 1 || email.IdempotencyKey == "" || len(email.IdempotencyKey) > 128 || strings.TrimSpace(email.Subject) == "" || len(email.Subject) > SubjectByteLimit || strings.ContainsAny(email.Subject, "\r\n") || len(email.HTML) > ContentLimit || len(email.Text) > ContentLimit || strings.TrimSpace(email.HTML+email.Text) == "" {
		return job, errors.New("invalid Sendy message: use one recipient, a stable key, and content within provider limits")
	}
	from := email.Sender.Email
	if email.Sender.Name != "" {
		from = (&mail.Address{Name: email.Sender.Name, Address: email.Sender.Email}).String()
	}
	attributes := map[string]string{"from": from, "to": email.To[0].Email, "subject": email.Subject}
	if email.HTML != "" {
		attributes["html"] = email.HTML
	}
	if email.Text != "" {
		attributes["text"] = email.Text
	}
	var response struct {
		Data Job `json:"data"`
	}
	err := c.request(ctx, http.MethodPost, "/emails", email.IdempotencyKey, map[string]any{"data": map[string]any{"type": "emails", "attributes": attributes}}, &response)
	if err == nil {
		err = validateJob(response.Data)
	}
	return response.Data, err
}
func validateJob(job Job) error {
	if job.ID == "" || job.Type != "emails" {
		return errors.New("Sendy returned an incomplete job")
	}
	switch job.Attributes.Status {
	case "queued", "processing", "accepted", "failed":
		return nil
	default:
		return errors.New("Sendy returned an unknown job status")
	}
}
func (c *Client) GetJob(ctx context.Context, id string) (Job, error) {
	var response struct {
		Data Job `json:"data"`
	}
	err := c.request(ctx, http.MethodGet, "/emails/"+url.PathEscape(id), "", nil, &response)
	if err == nil {
		err = validateJob(response.Data)
	}
	if err == nil && response.Data.ID != id {
		err = errors.New("Sendy returned a different job")
	}
	return response.Data, err
}

// APIError deliberately excludes provider details and request URLs, which can
// contain addresses or private content. HTTP status is the error contract.
type APIError struct {
	Status int
	Code   string
}

func (e *APIError) Error() string { return fmt.Sprintf("Sendy returned HTTP %d", e.Status) }

func (c *Client) request(ctx context.Context, method, path, key string, body, output any) error {
	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			return errors.New("encode Sendy request")
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, apiURL+path, bytes.NewReader(payload))
	if err != nil {
		return errors.New("build Sendy request")
	}
	req.Header.Set("Accept", MediaType)
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", MediaType)
	}
	if key != "" {
		req.Header.Set("Idempotency-Key", key)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return errors.New("Sendy request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		return &APIError{Status: resp.StatusCode}
	}
	if output != nil {
		if err = json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(output); err != nil {
			return errors.New("decode Sendy response")
		}
	}
	return nil
}
