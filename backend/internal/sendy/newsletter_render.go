package sendy

import (
	"bytes"
	"errors"
	"fmt"
	stdhtml "html"
	"html/template"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/text"
)

const NewsletterSubjectLimit = 180
const NewsletterBodyLimit = 40000

// Leave room for the signed per-recipient unsubscribe URL within Sendy's limit.
const NewsletterHTMLLimit = ContentLimit - 512
const unsubscribePlaceholder = "https://newsletter.invalid/unsubscribe"

// Preview, test and delivery share this renderer and the existing Postmark shell.
// No raw HTML or template expressions from the draft enter the email.
func RenderNewsletter(subject, markdown, siteURL string) (string, error) {
	if strings.TrimSpace(subject) == "" || utf8.RuneCountInString(subject) > NewsletterSubjectLimit || len(subject) > SubjectByteLimit || strings.ContainsAny(subject, "\r\n") || strings.Contains(subject, "{{") || strings.Contains(subject, "{%") {
		return "", errors.New("Enter a subject of up to 180 characters, without template expressions")
	}
	if strings.TrimSpace(markdown) == "" || len(markdown) > NewsletterBodyLimit {
		return "", errors.New("Write a newsletter of up to 40,000 bytes")
	}
	body, err := RenderMarkdown(markdown, siteURL)
	if err != nil {
		return "", err
	}
	// Reuse the inline email typography/spacing already defined in note.html.
	for _, tag := range []string{"p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "blockquote", "pre"} {
		body = strings.ReplaceAll(body, "<"+tag+">", "<"+tag+` style="margin:0 0 24px;font-size:16px;line-height:1.6">`)
	}
	body = strings.ReplaceAll(body, "<a ", `<a style="color:#ffffff;text-decoration:underline" `)
	body = frameEmailImages(body)
	html, _, err := RenderNote(Note{Title: subject, SiteURL: siteURL, Campaign: true, UnsubscribeURL: unsubscribePlaceholder, Body: template.HTML(body), Preheader: preheaderFrom(body)})
	if err == nil && len(html) > NewsletterHTMLLimit {
		return "", errors.New("This email is too large; shorten it before sending")
	}
	return html, err
}

var markup = regexp.MustCompile(`<[^>]*>`)

// The four article frames (lib/image-frames.ts). Email clients cannot crop with
// CSS, so Cloudinary images arrive padded into their frame at 1200px; other
// images keep their own shape at the frame's width.
var emailFrames = map[string]struct {
	ratio string
	width int
}{"landscape": {"3:2", 100}, "wide": {"16:9", 100}, "square": {"1:1", 66}, "portrait": {"4:5", 56}}
var (
	emailImage      = regexp.MustCompile(`<img src="([^"]*)"`)
	imageFrame      = regexp.MustCompile(`#frame=([a-z]+)$`)
	cloudinaryImage = regexp.MustCompile(`^https://res\.cloudinary\.com/([a-z0-9_-]+)/image/upload/(v\d+/.+)$`)
)

func frameEmailImages(body string) string {
	return emailImage.ReplaceAllStringFunc(body, func(tag string) string {
		src := emailImage.FindStringSubmatch(tag)[1]
		name := "landscape"
		if match := imageFrame.FindStringSubmatch(src); match != nil {
			if _, known := emailFrames[match[1]]; known {
				name = match[1]
			}
		}
		frame := emailFrames[name]
		src = imageFrame.ReplaceAllString(src, "")
		if match := cloudinaryImage.FindStringSubmatch(src); match != nil {
			src = "https://res.cloudinary.com/" + match[1] + "/image/upload/c_pad,ar_" + frame.ratio + ",b_transparent,w_1200/f_auto,q_auto/" + match[2]
		}
		return fmt.Sprintf(`<img style="display:block;width:%d%%;max-width:100%%;height:auto;margin:0 auto;padding:24px;box-sizing:border-box" src="%s"`, frame.width, src)
	})
}

// Preheader returns the inbox summary for a newsletter, as the email uses it.
func Preheader(markdown, siteURL string) string {
	body, err := RenderMarkdown(markdown, siteURL)
	if err != nil {
		return ""
	}
	return preheaderFrom(body)
}

// preheaderFrom takes the opening words of the email, as Buttondown does by
// default. Clients show roughly 40 to 140 characters.
func preheaderFrom(body string) string {
	// Braces are dropped so no provider template expression can form.
	text := strings.Join(strings.Fields(strings.NewReplacer("{", "", "}", "").Replace(stdhtml.UnescapeString(markup.ReplaceAllString(body, " ")))), " ")
	if utf8.RuneCountInString(text) <= 140 {
		return text
	}
	runes := []rune(text)[:140]
	if cut := strings.LastIndex(string(runes), " "); cut > 80 {
		return string(runes)[:cut] + "…"
	}
	return string(runes) + "…"
}

// RenderMarkdown is the shared safe renderer for published posts and email.
// Never evaluate uploaded MDX, raw HTML, or template expressions as code.
func RenderMarkdown(markdown, siteURL string) (string, error) {
	if strings.TrimSpace(markdown) == "" || len(markdown) > NewsletterBodyLimit {
		return "", errors.New("Write content of up to 40,000 bytes")
	}
	source := []byte(markdown)
	parser := goldmark.New(goldmark.WithExtensions(extension.Table, extension.Strikethrough, extension.TaskList))
	doc := parser.Parser().Parse(text.NewReader(source))
	base, err := url.Parse(siteURL)
	if err != nil {
		return "", err
	}
	err = ast.Walk(doc, func(node ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if node.Kind() == ast.KindHTMLBlock || node.Kind() == ast.KindRawHTML {
			return ast.WalkStop, errors.New("Use Markdown rather than raw HTML in the newsletter")
		}
		var destination *[]byte
		switch n := node.(type) {
		case *ast.Link:
			destination = &n.Destination
		case *ast.Image:
			destination = &n.Destination
		}
		if destination != nil {
			u, e := url.Parse(string(*destination))
			if e != nil {
				return ast.WalkStop, errors.New("Check the links in this newsletter")
			}
			u = base.ResolveReference(u)
			if u.User != nil || (u.Scheme != "https" && u.Scheme != "http" && u.Scheme != "mailto") || ((u.Scheme == "https" || u.Scheme == "http") && u.Host == "") {
				return ast.WalkStop, errors.New("Use web or email links in the newsletter")
			}
			localImage := base.Scheme == "http" && u.Scheme == "http" && u.Hostname() == base.Hostname()
			if _, image := node.(*ast.Image); image && u.Scheme != "https" && !localImage {
				return ast.WalkStop, errors.New("Use HTTPS image URLs")
			}
			*destination = []byte(u.String())
		}
		return ast.WalkContinue, nil
	})
	if err != nil {
		return "", err
	}
	var output bytes.Buffer
	if err = parser.Renderer().Render(&output, source, doc); err != nil {
		return "", err
	}
	body := strings.ReplaceAll(output.String(), "{{", "&#123;&#123;")
	body = strings.ReplaceAll(body, "{%", "&#123;%")
	return body, nil
}
