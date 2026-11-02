// Package brevo sends transactional email through Brevo's HTTP API.
package brevo

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const sendURL = "https://api.brevo.com/v3/smtp/email"

type Client struct {
	apiKey string
	http   *http.Client
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey, http: &http.Client{Timeout: 10 * time.Second}}
}

type Address struct {
	Name  string `json:"name,omitempty"`
	Email string `json:"email"`
}

type Email struct {
	Sender         Address
	To             []Address
	Subject        string
	HTML           string
	IdempotencyKey string // Brevo drops duplicate sends with the same key
}

func (c *Client) Send(ctx context.Context, email Email) error {
	body := map[string]any{
		"sender":      email.Sender,
		"to":          email.To,
		"subject":     email.Subject,
		"htmlContent": email.HTML,
	}
	if email.IdempotencyKey != "" {
		body["headers"] = map[string]string{"Idempotency-Key": email.IdempotencyKey}
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sendURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("accept", "application/json")
	req.Header.Set("api-key", c.apiKey)
	req.Header.Set("content-type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return fmt.Errorf("brevo returned %d: %s", resp.StatusCode, detail)
	}
	return nil
}
