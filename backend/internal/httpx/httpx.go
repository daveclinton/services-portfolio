// Package httpx holds the small HTTP helpers every product handler shares:
// JSON responses, bounded body reading, client IPs, UUIDs and Server-Sent Events.
package httpx

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"strings"
)

// WriteJSON writes v as a JSON response with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("write json response", "err", err)
	}
}

// Problem is the error body shape the frontend already understands.
type Problem struct {
	Detail string `json:"detail"`
	Errors any    `json:"errors,omitempty"`
}

func BadRequest(w http.ResponseWriter, detail string, fieldErrors any) {
	WriteJSON(w, http.StatusBadRequest, Problem{Detail: detail, Errors: fieldErrors})
}

// Unavailable answers 503 with a Retry-After hint.
func Unavailable(w http.ResponseWriter, detail string, retryAfterSeconds int) {
	w.Header().Set("Retry-After", fmt.Sprint(retryAfterSeconds))
	WriteJSON(w, http.StatusServiceUnavailable, Problem{Detail: detail})
}

var ErrBodyTooLarge = errors.New("request body is too large")
var ErrInvalidJSON = errors.New("request body must be valid JSON")

// ReadJSON reads at most maxBytes and decodes the body into a generic value.
// Numbers stay json.Number so handlers can check "is this an integer" exactly.
func ReadJSON(r *http.Request, maxBytes int64) (any, error) {
	if r.ContentLength > maxBytes {
		return nil, ErrBodyTooLarge
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, maxBytes+1))
	if err != nil {
		return nil, ErrInvalidJSON
	}
	if int64(len(raw)) > maxBytes {
		return nil, ErrBodyTooLarge
	}
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var body any
	if err := decoder.Decode(&body); err != nil {
		return nil, ErrInvalidJSON
	}
	if decoder.More() {
		return nil, ErrInvalidJSON
	}
	return body, nil
}

// ClientIP returns the visitor's address. The API is only reachable through
// nginx, which sets X-Forwarded-For to the real peer ($remote_addr), so the
// rightmost entry is trustworthy. When trustProxy is false we use the TCP peer.
func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			parts := strings.Split(forwarded, ",")
			if ip := strings.TrimSpace(parts[len(parts)-1]); ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// NewUUID returns a random RFC 4122 version 4 UUID.
func NewUUID() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

var uuidPattern = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`)

func IsUUID(value string) bool { return uuidPattern.MatchString(value) }

// SSE writes Server-Sent Events and flushes each one immediately.
type SSE struct {
	w  http.ResponseWriter
	rc *http.ResponseController
}

// StartSSE sends the event-stream headers. X-Accel-Buffering stops proxies
// from holding the stream back.
func StartSSE(w http.ResponseWriter) *SSE {
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)
	return &SSE{w: w, rc: http.NewResponseController(w)}
}

func (s *SSE) Send(event string, payload any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if _, err := fmt.Fprintf(s.w, "event: %s\ndata: %s\n\n", event, data); err != nil {
		return err
	}
	return s.rc.Flush()
}
