package sendy

import (
	"bytes"
	"errors"
	"html/template"
	"net/url"
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
	body = strings.ReplaceAll(body, "<img ", `<img style="max-width:100%;height:auto" `)
	html, _, err := RenderNote(Note{Title: subject, SiteURL: siteURL, Campaign: true, UnsubscribeURL: unsubscribePlaceholder, Body: template.HTML(body)})
	if err == nil && len(html) > NewsletterHTMLLimit {
		return "", errors.New("This email is too large; shorten it before sending")
	}
	return html, err
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
