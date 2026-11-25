package openai

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func TestStreamChatRequiresSuccessfulTerminalState(t *testing.T) {
	const text = `data: {"choices":[{"delta":{"content":"Answer"}}]}` + "\n\n"
	const stop = `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}` + "\n\n"
	const done = "data: [DONE]\n\n"
	cases := []struct {
		name, stream string
		want         error
		answer       string
	}{
		{"complete", text + stop + done, nil, "Answer"},
		{"usage chunk", text + stop + `data: {"choices":[],"usage":{"prompt_tokens":42,"completion_tokens":5}}` + "\n\n" + done, nil, "Answer"},
		{"truncated", text + `data: {"choices":[{"delta":{},"finish_reason":"length"}]}` + "\n\n" + done, ErrTruncated, "Answer"},
		{"filtered", `data: {"choices":[{"delta":{},"finish_reason":"content_filter"}]}` + "\n\n" + done, ErrRefused, ""},
		{"refusal", `data: {"choices":[{"delta":{"refusal":"Cannot answer"}}]}` + "\n\n" + done, ErrRefused, ""},
		{"empty", stop + done, ErrIncomplete, ""},
		{"missing finish", text + done, ErrIncomplete, "Answer"},
		{"disconnected", text, ErrIncomplete, "Answer"},
		{"missing done", text + stop, ErrIncomplete, "Answer"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			client := New("test-key")
			client.http.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.Header.Get("Authorization") != "Bearer test-key" {
					t.Fatal("missing authorization")
				}
				return &http.Response{StatusCode: http.StatusOK, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(tc.stream))}, nil
			})
			var answer strings.Builder
			usage, err := client.StreamChat(context.Background(), ChatRequest{Model: "test", MaxTokens: 10}, func(delta string) error { answer.WriteString(delta); return nil })
			if !errors.Is(err, tc.want) || answer.String() != tc.answer {
				t.Fatalf("answer=%q err=%v, want %q %v", answer.String(), err, tc.answer, tc.want)
			}
			if tc.name == "usage chunk" && usage.PromptTokens != 42 {
				t.Fatal("lost terminal usage")
			}
		})
	}
}

func TestStructuredChatStreamingUsesTheSameGenerationRequest(t *testing.T) {
	client := New("test-key")
	calls := 0
	client.http.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		calls++
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatal(err)
		}
		format := payload["response_format"].(map[string]any)
		schema := format["json_schema"].(map[string]any)
		if payload["stream"] != true || format["type"] != "json_schema" || schema["strict"] != true || schema["name"] != "portfolio_answer" {
			t.Fatalf("wrong generation contract: %+v", payload)
		}
		return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("data: {\"choices\":[{\"delta\":{\"content\":\"{\\\"answer\\\":\\\"Hello\\\"}\"}}]}\n\ndata: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n"))}, nil
	})
	var raw strings.Builder
	_, err := client.StreamChat(context.Background(), ChatRequest{Schema: map[string]any{"type": "object"}}, func(delta string) error { raw.WriteString(delta); return nil })
	if err != nil || calls != 1 || raw.String() != `{"answer":"Hello"}` {
		t.Fatalf("calls=%d raw=%q err=%v", calls, raw.String(), err)
	}
}

func TestStreamChatPreservesProviderErrorAndCancellation(t *testing.T) {
	client := New("test-key")
	client.http.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) {
		return &http.Response{StatusCode: http.StatusUnauthorized, Header: http.Header{"X-Request-Id": []string{"req-test"}}, Body: io.NopCloser(strings.NewReader(`{"error":{"code":"expired_secret_key"}}`))}, nil
	})
	_, err := client.StreamChat(context.Background(), ChatRequest{}, func(string) error { t.Fatal("must not emit text on authentication failure"); return nil })
	var apiError *APIError
	if !errors.As(err, &apiError) || apiError.Status != 401 || apiError.RequestID != "req-test" {
		t.Fatalf("lost provider diagnostics: %v", err)
	}
	client.http.Transport = roundTripFunc(func(r *http.Request) (*http.Response, error) { return nil, context.Canceled })
	_, err = client.StreamChat(context.Background(), ChatRequest{}, func(string) error { return nil })
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("lost cancellation: %v", err)
	}
}
