package studio

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"regexp"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/jackc/pgx/v5"
)

const mediaLimit = 5 << 20

var mediaID = regexp.MustCompile(`^[0-9a-f]{64}$`)

// Original raster bytes are kept durably with the existing PostgreSQL backups.
// Bound bytes and decoded dimensions before accepting a public image. SVG and
// other active formats are deliberately excluded; MIME comes from the decoder.
func (s *Service) uploadMedia(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, mediaLimit+(64<<10))
	if err := r.ParseMultipartForm(mediaLimit); err != nil {
		httpx.WriteJSON(w, 413, httpx.Problem{Detail: "Choose a PNG, JPEG or GIF of up to 5 MB."})
		return
	}
	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		httpx.BadRequest(w, "Choose an image to upload.", nil)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, mediaLimit+1))
	if err != nil || len(data) > mediaLimit {
		httpx.WriteJSON(w, 413, httpx.Problem{Detail: "Choose an image of up to 5 MB."})
		return
	}
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	types := map[string]string{"png": "image/png", "jpeg": "image/jpeg", "gif": "image/gif"}
	if err != nil || types[format] == "" || cfg.Width < 1 || cfg.Height < 1 || int64(cfg.Width)*int64(cfg.Height) > 16_000_000 {
		httpx.BadRequest(w, "Choose a valid PNG, JPEG or GIF of up to 16 megapixels.", nil)
		return
	}
	if _, _, err = image.Decode(bytes.NewReader(data)); err != nil {
		httpx.BadRequest(w, "This image could not be read. Try another file.", nil)
		return
	}
	hash := sha256.Sum256(data)
	id := hex.EncodeToString(hash[:])
	_, err = s.db.Exec(r.Context(), `INSERT INTO studio_media(id,content_type,data,width,height) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING`, id, types[format], data, cfg.Width, cfg.Height)
	if err != nil {
		httpx.Unavailable(w, "Could not save the image. Please try again.", 5)
		return
	}
	httpx.WriteJSON(w, 201, map[string]any{"url": s.cfg.NewsletterPublicAPIURL + "/media/" + id, "width": cfg.Width, "height": cfg.Height})
}
func (s *Service) media(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !mediaID.MatchString(id) {
		http.NotFound(w, r)
		return
	}
	etag := `"` + id + `"`
	if r.Header.Get("If-None-Match") == etag {
		var exists bool
		if err := s.db.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM studio_media WHERE id=$1)`, id).Scan(&exists); err != nil {
			httpx.Unavailable(w, "Could not load this image.", 5)
			return
		}
		if !exists {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("ETag", etag)
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		w.WriteHeader(304)
		return
	}
	var contentType string
	var data []byte
	if err := s.db.QueryRow(r.Context(), `SELECT content_type,data FROM studio_media WHERE id=$1`, id).Scan(&contentType, &data); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.NotFound(w, r)
			return
		}
		httpx.Unavailable(w, "Could not load this image.", 5)
		return
	}
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", "inline")
	w.Write(data)
}
