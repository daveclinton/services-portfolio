// Package openai is a small client for the OpenAI calls the API makes:
// streamed chat completions, structured JSON output (intent planning) and
// embeddings. It uses net/http directly, which keeps every request visible.
package openai

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const baseURL = "https://api.openai.com/v1"

type Client struct {
	apiKey string
	http   *http.Client
}

// New returns a client. No global timeout is set because streams can run for
// a while; every call takes a context with its own deadline instead.
func New(apiKey string) *Client {
	return &Client{apiKey: apiKey, http: &http.Client{}}
}

func (c *Client) Enabled() bool { return c != nil && c.apiKey != "" }

// APIError is a non-2xx answer from OpenAI.
type APIError struct {
	Status    int
	Body      string
	RequestID string
}

func (e *APIError) Error() string {
	msg := fmt.Sprintf("openai returned %d", e.Status)
	if e.RequestID != "" {
		msg += " (request " + e.RequestID + ")"
	}
	if e.Body != "" {
		msg += ": " + e.Body
	}
	return msg
}

var ErrNotConfigured = errors.New("OPENAI_API_KEY is not configured")
var ErrTruncated = errors.New("model response reached the output token limit")
var ErrIncomplete = errors.New("model response ended before a successful finish")
var ErrRefused = errors.New("model response was refused or filtered")

func (c *Client) post(ctx context.Context, path string, body any) (*http.Response, error) {
	if !c.Enabled() {
		return nil, ErrNotConfigured
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		defer resp.Body.Close()
		detail, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		return nil, &APIError{Status: resp.StatusCode, Body: string(detail), RequestID: resp.Header.Get("x-request-id")}
	}
	return resp, nil
}

func (c *Client) postJSON(ctx context.Context, path string, body, out any) error {
	resp, err := c.post(ctx, path, body)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return json.NewDecoder(resp.Body).Decode(out)
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model       string
	Messages    []Message
	Temperature float64
	MaxTokens   int
}

// Usage reports token counts; CachedTokens is the part of the prompt served
// from OpenAI's automatic prompt cache (billed at a discount).
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	Details          struct {
		CachedTokens int `json:"cached_tokens"`
	} `json:"prompt_tokens_details"`
}

// StreamChat streams a chat completion and calls onDelta for every text piece.
// The returned usage comes from the final stream chunk.
func (c *Client) StreamChat(ctx context.Context, req ChatRequest, onDelta func(string) error) (Usage, error) {
	var usage Usage
	resp, err := c.post(ctx, "/chat/completions", map[string]any{
		"model":                 req.Model,
		"messages":              req.Messages,
		"temperature":           req.Temperature,
		"max_completion_tokens": req.MaxTokens,
		"stream":                true,
		"stream_options":        map[string]bool{"include_usage": true},
	})
	if err != nil {
		return usage, err
	}
	defer resp.Body.Close()

	finishReason := ""
	hasContent := false
	scanner := bufio.NewScanner(resp.Body)
	scanner.Buffer(make([]byte, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		data, ok := strings.CutPrefix(line, "data:")
		if !ok {
			continue
		}
		data = strings.TrimSpace(data)
		if data == "[DONE]" {
			switch finishReason {
			case "length":
				return usage, ErrTruncated
			case "content_filter":
				return usage, ErrRefused
			case "stop":
				if hasContent {
					return usage, nil
				}
			}
			return usage, ErrIncomplete
		}
		var chunk struct {
			Choices []struct {
				FinishReason *string `json:"finish_reason"`
				Delta        struct {
					Content string `json:"content"`
					Refusal string `json:"refusal"`
				} `json:"delta"`
			} `json:"choices"`
			Usage *Usage           `json:"usage"`
			Error *json.RawMessage `json:"error"`
		}
		if err := json.Unmarshal([]byte(data), &chunk); err != nil {
			return usage, fmt.Errorf("decode stream chunk: %w", err)
		}
		if chunk.Error != nil {
			return usage, &APIError{Status: http.StatusOK, Body: string(*chunk.Error)}
		}
		if chunk.Usage != nil {
			usage = *chunk.Usage
		}
		for _, choice := range chunk.Choices {
			if choice.FinishReason != nil {
				finishReason = *choice.FinishReason
			}
			if choice.Delta.Refusal != "" {
				return usage, ErrRefused
			}
			if choice.Delta.Content == "" {
				continue
			}
			hasContent = hasContent || strings.TrimSpace(choice.Delta.Content) != ""
			if err := onDelta(choice.Delta.Content); err != nil {
				return usage, err
			}
		}
	}
	if err := scanner.Err(); err != nil {
		return usage, err
	}
	return usage, ErrIncomplete
}

type StructuredRequest struct {
	Model       string
	System      string
	User        string
	SchemaName  string
	Schema      map[string]any
	Temperature float64
	MaxTokens   int
}

// Structured asks for a reply that matches a JSON schema and decodes it into out.
func (c *Client) Structured(ctx context.Context, req StructuredRequest, out any) error {
	var resp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
				Refusal string `json:"refusal"`
			} `json:"message"`
		} `json:"choices"`
	}
	err := c.postJSON(ctx, "/chat/completions", map[string]any{
		"model": req.Model,
		"messages": []Message{
			{Role: "system", Content: req.System},
			{Role: "user", Content: req.User},
		},
		"temperature":           req.Temperature,
		"max_completion_tokens": req.MaxTokens,
		"response_format": map[string]any{
			"type": "json_schema",
			"json_schema": map[string]any{
				"name":   req.SchemaName,
				"strict": true,
				"schema": req.Schema,
			},
		},
	}, &resp)
	if err != nil {
		return err
	}
	if len(resp.Choices) == 0 {
		return errors.New("structured output returned no choices")
	}
	message := resp.Choices[0].Message
	if message.Refusal != "" {
		return fmt.Errorf("model refused: %s", message.Refusal)
	}
	return json.Unmarshal([]byte(message.Content), out)
}

// Embed returns one embedding per input, in input order. dimensions shortens
// text-embedding-3 vectors when non-zero.
func (c *Client) Embed(ctx context.Context, model string, inputs []string, dimensions int) ([][]float32, error) {
	body := map[string]any{"model": model, "input": inputs, "encoding_format": "float"}
	if dimensions > 0 {
		body["dimensions"] = dimensions
	}
	var resp struct {
		Data []struct {
			Index     int       `json:"index"`
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	if err := c.postJSON(ctx, "/embeddings", body, &resp); err != nil {
		return nil, err
	}
	if len(resp.Data) != len(inputs) {
		return nil, fmt.Errorf("embeddings: got %d vectors for %d inputs", len(resp.Data), len(inputs))
	}
	vectors := make([][]float32, len(inputs))
	for _, item := range resp.Data {
		if item.Index < 0 || item.Index >= len(inputs) {
			return nil, fmt.Errorf("embeddings: index %d out of range", item.Index)
		}
		vectors[item.Index] = item.Embedding
	}
	return vectors, nil
}
