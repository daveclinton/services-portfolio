package askai

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

var tokenPattern = regexp.MustCompile(`[a-z0-9][a-z0-9+#._-]*`)

var stopwords = toSet(
	"a", "about", "an", "and", "any", "are", "as", "at", "be", "been",
	"but", "by", "can", "did", "do", "does", "for", "from", "get", "had",
	"has", "have", "he", "her", "his", "how", "i", "in", "into", "is",
	"it", "its", "me", "my", "of", "on", "or", "our", "she", "so",
	"that", "the", "their", "them", "then", "there", "these", "they",
	"this", "to", "up", "us", "was", "we", "were", "what", "when",
	"where", "which", "who", "why", "will", "with", "you", "your",
)

// tokenize lowercases text and returns unique search terms without stopwords.
func tokenize(text string) []string {
	var terms []string
	seen := map[string]bool{}
	for _, raw := range tokenPattern.FindAllString(strings.ToLower(text), -1) {
		term := strings.Trim(raw, "._-")
		if len(term) < 2 || stopwords[term] || seen[term] {
			continue
		}
		seen[term] = true
		terms = append(terms, term)
	}
	return terms
}

// normalize lowercases and collapses whitespace, for pattern matching.
func normalize(text string) string {
	return strings.Join(strings.Fields(strings.ToLower(text)), " ")
}

// excerpt collapses whitespace and trims to limit characters.
func excerpt(text string, limit int) string {
	collapsed := strings.Join(strings.Fields(text), " ")
	if utf8.RuneCountInString(collapsed) <= limit {
		return collapsed
	}
	runes := []rune(collapsed)[:limit-1]
	return strings.TrimRight(string(runes), " \t\n") + "…"
}

func toSet(values ...string) map[string]bool {
	set := make(map[string]bool, len(values))
	for _, v := range values {
		set[v] = true
	}
	return set
}

// uniqueTrimmed trims values, drops empties and duplicates, and keeps at most max.
func uniqueTrimmed(values []string, max int) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, v := range values {
		v = strings.TrimSpace(v)
		if v == "" || seen[v] {
			continue
		}
		seen[v] = true
		out = append(out, v)
		if len(out) == max {
			break
		}
	}
	return out
}
