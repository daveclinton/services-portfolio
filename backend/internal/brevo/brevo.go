// Package brevo sends transactional email through Brevo's HTTP API.
package brevo

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const apiURL = "https://api.brevo.com/v3"

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
	Text           string
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
		body["headers"] = map[string]string{"idempotencyKey": email.IdempotencyKey}
	}
	if email.Text != "" {
		body["textContent"] = email.Text
	}
	err := c.request(ctx, http.MethodPost, "/smtp/email", body, nil)
	var providerError *APIError
	if email.IdempotencyKey != "" && errors.As(err, &providerError) && providerError.Status == http.StatusBadRequest && providerError.Code == "duplicate_parameter" {
		return nil
	}
	return err
}

// APIError omits provider messages, which can contain email addresses.
type APIError struct {
	Status int
	Code   string
}

func (e *APIError) Error() string { return fmt.Sprintf("brevo returned %d (%s)", e.Status, e.Code) }

func (c *Client) request(ctx context.Context, method, path string, body, output any) error {
	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			return err
		}
	}
	req, err := http.NewRequestWithContext(ctx, method, apiURL+path, bytes.NewReader(payload))
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
		var providerError struct {
			Code string `json:"code"`
		}
		_ = json.NewDecoder(io.LimitReader(resp.Body, 4096)).Decode(&providerError)
		return &APIError{Status: resp.StatusCode, Code: providerError.Code}
	}
	if output != nil {
		return json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(output)
	}
	return nil
}
