// Package embeddings talks to a self-hosted Hugging Face Text Embeddings
// Inference (TEI) server, so embeddings never leave our own infrastructure.
// API: https://github.com/huggingface/text-embeddings-inference
package embeddings

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 2 * time.Minute},
	}
}

func (c *Client) Enabled() bool { return c != nil && c.baseURL != "" }

// Embed returns one normalized vector per input, in order. Inputs longer than
// the model's limit are truncated by the server.
func (c *Client) Embed(ctx context.Context, inputs []string) ([][]float32, error) {
	if !c.Enabled() {
		return nil, errors.New("EMBEDDINGS_URL is not configured")
	}
	body, err := json.Marshal(map[string]any{"inputs": inputs, "truncate": true, "normalize": true})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/embed", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
		return nil, fmt.Errorf("embeddings server returned %d: %s", resp.StatusCode, detail)
	}
	var vectors [][]float32
	if err := json.NewDecoder(resp.Body).Decode(&vectors); err != nil {
		return nil, fmt.Errorf("decode embeddings: %w", err)
	}
	if len(vectors) != len(inputs) {
		return nil, fmt.Errorf("embeddings server returned %d vectors for %d inputs", len(vectors), len(inputs))
	}
	return vectors, nil
}
