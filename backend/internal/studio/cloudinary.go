package studio

import (
	"crypto/sha1"
	"encoding/hex"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
)

// Formats Cloudinary accepts for article images. Nothing is rejected for its
// size or shape: every image is shown in one of the four frames.
const cloudinaryFormats = "avif,gif,heic,heif,jpeg,jpg,png,webp"

// signUpload lets the owner's browser upload one image straight to Cloudinary.
// The secret never leaves the server; the signature fixes the folder, a random
// file name and the allowed formats, and expires with its timestamp.
// https://cloudinary.com/documentation/authentication_signatures
func (s *Service) signUpload(w http.ResponseWriter, r *http.Request) {
	if _, ok := readInput(w, r); !ok {
		return
	}
	if s.cfg.CloudinaryAPISecret == "" {
		httpx.WriteJSON(w, 200, map[string]any{"configured": false})
		return
	}
	params := map[string]string{
		"allowed_formats": cloudinaryFormats,
		"folder":          "blog",
		"public_id":       httpx.NewUUID(),
		"timestamp":       strconv.FormatInt(time.Now().Unix(), 10),
	}
	httpx.WriteJSON(w, 200, map[string]any{
		"configured": true, "cloud_name": s.cfg.CloudinaryCloudName, "api_key": s.cfg.CloudinaryAPIKey,
		"signature": cloudinarySignature(params, s.cfg.CloudinaryAPISecret), "params": params,
	})
}

// Parameters sorted by name, joined as key=value with &, then the secret,
// hashed with SHA-1, as Cloudinary verifies them.
func cloudinarySignature(params map[string]string, secret string) string {
	keys := make([]string, 0, len(params))
	for key := range params {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	parts := make([]string, len(keys))
	for i, key := range keys {
		parts[i] = key + "=" + params[key]
	}
	sum := sha1.Sum([]byte(strings.Join(parts, "&") + secret))
	return hex.EncodeToString(sum[:])
}
