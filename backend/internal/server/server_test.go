package server

import (
	"bufio"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
)

type streamingProduct struct{ release chan struct{} }

func (p streamingProduct) Routes(mux *http.ServeMux) {
	mux.HandleFunc("POST /stream", func(w http.ResponseWriter, r *http.Request) {
		stream := httpx.StartSSE(w)
		_ = stream.Send("delta", map[string]string{"text": "first"})
		<-p.release // hold the response open until the client has read the first frame
		_ = stream.Send("done", map[string]string{"finish_reason": "stop"})
	})
}

func handler(p Product) http.Handler {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return cors([]string{"https://www.example.com"}, logRequests(log, muxFor(p)))
}

func muxFor(p Product) *http.ServeMux {
	mux := http.NewServeMux()
	p.Routes(mux)
	return mux
}

func TestPreflight(t *testing.T) {
	h := handler(streamingProduct{})
	req := httptest.NewRequest(http.MethodOptions, "/stream", nil)
	req.Header.Set("Origin", "https://www.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Credentials") != "true" {
		t.Fatalf("allowed preflight: %d %v", rec.Code, rec.Header())
	}

	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden || rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("disallowed preflight: %d %v", rec.Code, rec.Header())
	}
}

// Frames must reach the client before the handler returns, even through the
// logging middleware's wrapped ResponseWriter.
func TestSSEFlushesThroughMiddleware(t *testing.T) {
	release := make(chan struct{})
	srv := httptest.NewServer(handler(streamingProduct{release: release}))
	defer srv.Close()
	defer close(release)

	resp, err := http.Post(srv.URL+"/stream", "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	lines := make(chan string, 1)
	go func() {
		line, _ := bufio.NewReader(resp.Body).ReadString('\n')
		lines <- line
	}()
	select {
	case line := <-lines:
		if line != "event: delta\n" {
			t.Fatalf("first line = %q", line)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("first SSE frame was buffered instead of flushed")
	}
}
