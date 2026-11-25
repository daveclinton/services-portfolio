package studio

import (
	"context"
	"io"
	"net/http"
	"time"
)

// A short, bounded webhook expires Next's public cache after the transaction.
// A failure cannot undo publication; the 30-second ISR interval is a fallback.
func (s *Service) revalidate() bool {
	if s.cfg.ContentRevalidationSecret == "" {
		return false
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, "POST", s.cfg.SiteURL+"/api/content/revalidate", nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.ContentRevalidationSecret)
	response, err := s.http.Do(req)
	if err != nil {
		s.log.Warn("public cache refresh failed")
		return false
	}
	defer response.Body.Close()
	io.Copy(io.Discard, io.LimitReader(response.Body, 4096))
	return response.StatusCode == http.StatusOK
}
