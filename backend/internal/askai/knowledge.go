package askai

import (
	"context"
	_ "embed"
	"fmt"
	"strings"
	"time"
)

// The whole knowledge base is small (about 30k tokens), so every answer gets
// all of it, not just the top retrieved chunks. Anthropic's Contextual
// Retrieval write-up recommends exactly this below ~200k tokens: it removes
// retrieval misses, and because the text is identical across requests and
// sits at the start of the prompt, OpenAI's automatic prompt caching makes the
// repeated prefix cheaper and faster. Retrieval still runs to point the model
// at the most relevant documents and to fill the citations event.

//go:embed site_facts.md
var siteFacts string

type knowledgeSnapshot struct {
	text      string
	documents int
	loadedAt  time.Time
}

// loadKnowledge renders every chunk, grouped by source document in a stable
// order (stable text keeps the prompt cache warm), plus confirmed evidence.
func (s *Service) loadKnowledge(ctx context.Context) (*knowledgeSnapshot, error) {
	rows, err := s.db.Query(ctx, `
		SELECT COALESCE(source_path, ''), COALESCE(source_type, ''), COALESCE(content, '')
		  FROM knowledge_knowledgechunk
		 ORDER BY source_path, id`)
	if err != nil {
		return nil, err
	}
	var b strings.Builder
	b.WriteString(strings.TrimSpace(siteFacts))
	b.WriteString("\n\n# Knowledge base\n")
	documents, currentPath := 0, "\x00"
	for rows.Next() {
		var path, sourceType, content string
		if err := rows.Scan(&path, &sourceType, &content); err != nil {
			rows.Close()
			return nil, err
		}
		if path != currentPath {
			currentPath = path
			documents++
			fmt.Fprintf(&b, "\n## %s (%s)\n", path, sourceType)
		}
		b.WriteString(strings.TrimSpace(content))
		b.WriteString("\n")
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	claims, err := s.db.Query(ctx, `
		SELECT COALESCE(claim, '') FROM knowledge_evidence
		 WHERE confidence = 'confirmed' ORDER BY slug`)
	if err != nil {
		return nil, err
	}
	first := true
	for claims.Next() {
		var claim string
		if err := claims.Scan(&claim); err != nil {
			claims.Close()
			return nil, err
		}
		if first {
			b.WriteString("\n# Confirmed evidence claims\n")
			first = false
		}
		b.WriteString("- ")
		b.WriteString(strings.Join(strings.Fields(claim), " "))
		b.WriteString("\n")
	}
	claims.Close()
	if err := claims.Err(); err != nil {
		return nil, err
	}
	return &knowledgeSnapshot{text: b.String(), documents: documents, loadedAt: time.Now()}, nil
}

// refreshKnowledge reloads the snapshot; on failure the previous one stays.
func (s *Service) refreshKnowledge(ctx context.Context) {
	snapshot, err := s.loadKnowledge(ctx)
	if err != nil {
		s.log.Warn("reload knowledge base", "err", err)
		return
	}
	previous := s.knowledge.Swap(snapshot)
	if previous == nil || previous.text != snapshot.text {
		s.log.Info("knowledge base loaded", "documents", snapshot.documents, "chars", len(snapshot.text))
	}
}
