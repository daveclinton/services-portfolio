package sendy

import (
	"strings"
	"testing"
)

func TestNewsletterRendererFollowsTheReadersThemeAndEscapesTemplateExpressions(t *testing.T) {
	html, err := RenderNewsletter("A & B", "# A heading\n\nHello **reader**. [Read more](/blog).\n\n`{{ contact.SECRET }}`\n\n`{% if contact.SECRET %}`", "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	for _, part := range []string{`content="light dark"`, "Georgia", "A &amp; B", "<strong>reader</strong>", `href="https://example.com/blog"`, `href="` + unsubscribePlaceholder + `"`, "&#123;&#123; contact.SECRET"} {
		if !strings.Contains(html, part) {
			t.Errorf("email missing %s", part)
		}
	}
	// No forced palette: the mail app's light or dark theme decides.
	if strings.Contains(html, "background-color") || strings.Contains(html, "#1557c0") || strings.Contains(html, "#ffffff") {
		t.Fatal("email forces its own colours")
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

func TestNewsletterPreheaderIsHiddenPlainOpeningText(t *testing.T) {
	md := "## Hello\n\nThis is **bold** & [linked](https://example.com) text. " + strings.Repeat("More words here. ", 20)
	pre := Preheader(md, "https://example.com")
	if !strings.HasPrefix(pre, "Hello This is bold & linked text.") || !strings.HasSuffix(pre, "…") || len([]rune(pre)) > 141 || strings.Contains(pre, "<") {
		t.Fatalf("unexpected preheader %q", pre)
	}
	html, err := RenderNewsletter("Subject", md, "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	start := strings.Index(html, `<div style="display:none`)
	if start < 0 || start > strings.Index(html, "<h2") || !strings.Contains(html[start:], "Hello This is bold &amp; linked text.") {
		t.Fatal("preheader is not hidden at the top of the email")
	}
	if got := Preheader("`{{ contact.SECRET }}` and {% raw %}", "https://example.com"); strings.ContainsAny(got, "{}") {
		t.Fatalf("template expression in preheader: %q", got)
	}
	if got := Preheader("Short.", "https://example.com"); got != "Short." {
		t.Fatalf("short preheader changed: %q", got)
	}
}

func TestNewsletterImagesUseTheirArticleFrame(t *testing.T) {
	md := "![a](https://res.cloudinary.com/my-cloud/image/upload/v17/blog/x.jpg#frame=square)\n\n![b](https://example.com/b.png#frame=wide)\n\n![c](https://example.com/c.png)\n\n![d](https://example.com/d.png#frame=bogus)"
	html, err := RenderNewsletter("Frames", md, "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{
		`width:66%;max-width:100%;height:auto;margin:0 auto;padding:24px;box-sizing:border-box" src="https://res.cloudinary.com/my-cloud/image/upload/c_pad,ar_1:1,b_transparent,w_1200/f_auto,q_auto/v17/blog/x.jpg"`,
		`width:100%;max-width:100%;height:auto;margin:0 auto;padding:24px;box-sizing:border-box" src="https://example.com/b.png"`,
		`src="https://example.com/c.png"`,
		`src="https://example.com/d.png"`,
	} {
		if !strings.Contains(html, want) {
			t.Errorf("missing %s", want)
		}
	}
	if strings.Contains(html, "#frame=") {
		t.Fatal("frame markers leaked into the email")
	}
}

func TestNewsletterBodyDoesNotRepeatTheInboxHeader(t *testing.T) {
	html, err := RenderNewsletter("A distinctive subject line", "Opening paragraph.", "https://example.com")
	if err != nil {
		t.Fatal(err)
	}
	body := html[strings.Index(html, "<body"):]
	if strings.Contains(body, "A distinctive subject line") || strings.Contains(body, "David Clinton") || strings.Contains(body, "<h1") {
		t.Fatal("campaign body repeats the sender or subject the inbox already shows")
	}
	if !strings.Contains(body, "Opening paragraph.") || !strings.Contains(html, "<title>A distinctive subject line</title>") {
		t.Fatal("campaign lost its content or document title")
	}
	note, _, err := RenderNote(Note{Title: "Confirm your subscription", SiteURL: "https://example.com", Confirmation: true, ConfirmationURL: "https://example.com/c"})
	if err != nil || !strings.Contains(note, "<h1") || !strings.Contains(note, "David Clinton") {
		t.Fatal("transactional notes must keep their heading")
	}
}
