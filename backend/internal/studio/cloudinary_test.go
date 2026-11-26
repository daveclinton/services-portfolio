package studio

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

// Cloudinary's documented example: public_id=sample_image&timestamp=1315060510
// with secret abcd gives this SHA-1.
// https://cloudinary.com/documentation/authentication_signatures
func TestCloudinarySignatureMatchesTheDocumentedExample(t *testing.T) {
	got := cloudinarySignature(map[string]string{"timestamp": "1315060510", "public_id": "sample_image"}, "abcd")
	if got != "b4ad47fb4e25c7bf5f92a20089f9db59bc302313" {
		t.Fatalf("unexpected signature %s", got)
	}
}

func TestSigningRequiresTheOwnerAndFallsBackWithoutCloudinary(t *testing.T) {
	f := newFixture(t)
	var body struct {
		Configured bool              `json:"configured"`
		Cloud      string            `json:"cloud_name"`
		Key        string            `json:"api_key"`
		Signature  string            `json:"signature"`
		Params     map[string]string `json:"params"`
	}
	w := f.request("POST", "/admin/newsletters/media/sign", map[string]any{})
	if json.Unmarshal(w.Body.Bytes(), &body); w.Code != 200 || body.Configured {
		t.Fatalf("expected the PostgreSQL fallback: %d %s", w.Code, w.Body)
	}
	f.s.cfg.CloudinaryCloudName, f.s.cfg.CloudinaryAPIKey, f.s.cfg.CloudinaryAPISecret = "my-cloud", "123", "shh"
	w = f.request("POST", "/admin/newsletters/media/sign", map[string]any{})
	json.Unmarshal(w.Body.Bytes(), &body)
	if !body.Configured || body.Cloud != "my-cloud" || body.Key != "123" || body.Params["folder"] != "blog" || body.Params["allowed_formats"] != cloudinaryFormats {
		t.Fatalf("unexpected signing response: %s", w.Body)
	}
	if strings.Contains(w.Body.String(), "shh") || body.Signature != cloudinarySignature(body.Params, "shh") {
		t.Fatal("the secret leaked or the signature does not cover the returned parameters")
	}
	anonymous := httptest.NewRecorder()
	f.handler.ServeHTTP(anonymous, httptest.NewRequest("POST", "/admin/newsletters/media/sign", strings.NewReader("{}")))
	if anonymous.Code != 401 {
		t.Fatalf("signing without the owner session: %d", anonymous.Code)
	}
}
