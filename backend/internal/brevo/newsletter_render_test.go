package brevo

import (
	"strings"
	"testing"
)

func TestNewsletterRendererUsesExistingThemeAndEscapesTemplateExpressions(t *testing.T) {
	html, err := RenderNewsletter("A & B", "# A heading\n\nHello **reader**. [Read more](/blog).\n\n`{{ contact.SECRET }}`\n\n`{% if contact.SECRET %}`", "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{"#1557c0", "Georgia", "A &amp; B", "<strong>reader</strong>", `href="https://example.com/blog"`, `href="{{ unsubscribe }}"`, "&#123;&#123; contact.SECRET"} {
		if !strings.Contains(html, part) {
			t.Errorf("email missing %s", part)
		}
	}
	if strings.Contains(html, "{{ contact.SECRET }}") || strings.Contains(html, "{%") || strings.Contains(html, "ZgotmplZ") {
		t.Fatal("unsafe template or invalid link")
	}
}
func TestNewsletterRendererRejectsUnsafeMarkupAndOversizedContent(t *testing.T) {
	for _, body := range []string{"<script>alert(1)</script>", "[bad](javascript:alert)", "![bad](http://example.com/image.png)", strings.Repeat("x", NewsletterBodyLimit+1)} {
		if _, err := RenderNewsletter("Subject", body, "https://example.com"); err == nil {
			t.Fatalf("accepted unsafe content: %.50s", body)
		}
	}
	for _, subject := range []string{"", "Line\r\nBcc: bad", "{{ contact.SECRET }}", "{% if contact.SECRET %}", strings.Repeat("x", NewsletterSubjectLimit+1)} {
		if _, err := RenderNewsletter(subject, "Body", "https://example.com"); err == nil {
			t.Fatal("accepted invalid subject")
		}
	}
}
