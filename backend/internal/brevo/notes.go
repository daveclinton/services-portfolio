package brevo

import (
	"bytes"
	_ "embed"
	"html/template"
	"strings"
)

//go:embed templates/note.html
var noteHTML string

// Alternate delimiters preserve Brevo's literal {{ params.DOIurl }} token.
var noteTemplate = template.Must(template.New("note").Delims("[[", "]]").Funcs(template.FuncMap{
	// html/template strips ordinary comments. Only these fixed, trusted Outlook
	// wrappers bypass escaping; visitor content remains escaped normally.
	"outlookOpen": func() template.HTML {
		return template.HTML(`<!--[if mso]><table role="presentation" width="640"><tr><td><![endif]-->`)
	},
	"outlookClose": func() template.HTML { return template.HTML(`<!--[if mso]></td></tr></table><![endif]-->`) },
}).Parse(noteHTML))

type NoteSection struct{ Label, Text string }
type Note struct {
	Title, Intro, SiteURL, Footer string
	Sections                      []NoteSection
	Confirmation                  bool
}

func RenderNote(note Note) (string, string, error) {
	var body bytes.Buffer
	if err := noteTemplate.Execute(&body, note); err != nil {
		return "", "", err
	}
	parts := []string{"David Clinton", note.Title}
	if note.Intro != "" {
		parts = append(parts, note.Intro)
	}
	for _, section := range note.Sections {
		parts = append(parts, section.Label+"\n"+section.Text)
	}
	if note.Confirmation {
		parts = append(parts, "Confirm my email: {{ params.DOIurl }}", "By confirming, you agree to occasional emails from David. Free to read. Unsubscribe anytime. Privacy: "+note.SiteURL+"/privacy")
	}
	if note.Footer != "" {
		parts = append(parts, note.Footer)
	}
	return body.String(), strings.Join(parts, "\n\n"), nil
}

func ConfirmationNote(siteURL string) Note {
	return Note{Title: "One last click.", Intro: "Confirm your email to get occasional notes on what I’m building, learning, and writing.", SiteURL: siteURL, Confirmation: true, Footer: "If you didn’t ask for this, you can ignore this email."}
}
