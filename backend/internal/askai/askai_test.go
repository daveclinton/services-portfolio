package askai

import (
	"bytes"
	"encoding/json"
	"github.com/daveclinton/portfolio/backend/internal/openai"
	"slices"
	"strings"
	"testing"
)

func TestTokenize(t *testing.T) {
	got := tokenize("What has David built with Next.js and C#? next.js!")
	want := []string{"david", "built", "next.js", "c#"}
	if !slices.Equal(got, want) {
		t.Fatalf("tokenize = %v, want %v", got, want)
	}
}

func TestClassifyByRules(t *testing.T) {
	cases := map[string]string{
		"How much does David charge?":     "rates",
		"What impact did his work have?":  "outcomes",
		"Which frameworks does he use?":   "technologies",
		"Should I hire him?":              "skills",
		"Where did David work?":           "experience",
		"Show me a project he shipped":    "projects",
		"Who is David?":                   "biography",
		"Is the weather nice in Nairobi?": "general",
		"  WHAT DOES   DAVID DO?  ":       "biography",
	}
	for question, want := range cases {
		if got := classifyByRules(question).Name; got != want {
			t.Errorf("classifyByRules(%q) = %s, want %s", question, got, want)
		}
	}
}

func TestConversationalReply(t *testing.T) {
	if conversationalReply("Hello there!") == "" {
		t.Error("greeting should get a canned reply")
	}
	if conversationalReply("hello, what has David built?") != "" {
		t.Error("real questions must go to retrieval")
	}
}

func TestReciprocalRankFusion(t *testing.T) {
	fused := reciprocalRankFusion(map[string][]int64{
		"structured": {1, 2, 3},
		"semantic":   {3, 1},
	})
	order := make([]int64, len(fused))
	for i, hit := range fused {
		order[i] = hit.key
	}
	// 1: 1/61+1/62, 3: 1/63+1/61, 2: 1/62
	if want := []int64{1, 3, 2}; !slices.Equal(order, want) {
		t.Fatalf("fusion order = %v, want %v", order, want)
	}
	if fused[0].ranks["structured"] != 1 || fused[0].ranks["semantic"] != 2 {
		t.Fatalf("ranks not recorded: %+v", fused[0].ranks)
	}
}

func TestRerankPutsAnchorsFirstAndDiversifiesBiography(t *testing.T) {
	results := []*SearchResult{
		{ChunkID: 1, SourceType: "project-overview", ProjectSlug: "a"},
		{ChunkID: 2, SourceType: "project-overview", ProjectSlug: "a"},
		{ChunkID: 3, SourceType: "experience-overview", CompanySlug: "x"},
	}
	anchor := &SearchResult{ChunkID: 9, SourceType: "person-profile", SourcePath: profilePath}
	got := rerankForIntent(results, intentByName("biography"), rerankOptions{limit: 3, anchors: []*SearchResult{anchor}})
	ids := []int64{}
	for _, r := range got {
		ids = append(ids, r.ChunkID)
	}
	// Anchor first, then experience-overview (priority 1), then project a once.
	if want := []int64{9, 3, 1}; !slices.Equal(ids, want) {
		t.Fatalf("rerank = %v, want %v", ids, want)
	}
	for i, r := range got {
		if r.Rank != i+1 {
			t.Fatalf("ranks not renumbered: %+v", r)
		}
	}
}

func TestVectorLiteral(t *testing.T) {
	if got := vectorLiteral([]float32{0.5, -1, 0.25}); got != "[0.5,-1,0.25]" {
		t.Fatalf("vectorLiteral = %s", got)
	}
}

func TestBuildMessagesPutsStaticKnowledgeFirst(t *testing.T) {
	sources := []source{
		{Index: 1, SourcePath: "knowledge/a.md", Citations: []EvidenceCitation{}},
		{Index: 2, SourcePath: "knowledge/a.md", Citations: []EvidenceCitation{}},
		{Index: 3, SourcePath: "knowledge/b.md", Citations: []EvidenceCitation{}},
	}
	decision := intentDecision{Intent: generalIntent, Plan: responsePlan{ResponseMode: "answer"}}
	knowledge := "KNOWLEDGE with {placeholders} kept literal"
	messages := buildMessages("Q?", knowledge, sources, []chatTurn{{Role: "assistant", Content: "  hi "}}, decision)

	if len(messages) != 4 {
		t.Fatalf("want policy, plan, history, question; got %d messages", len(messages))
	}
	if messages[0].Content != answerPolicy+knowledge {
		t.Fatal("the first message must be exactly the static policy plus knowledge, so it can be cached")
	}
	if !strings.Contains(messages[1].Content, "knowledge/a.md, knowledge/b.md") {
		t.Fatalf("plan should list each relevant document once: %s", messages[1].Content)
	}
	if messages[2].Content != "hi" || messages[3] != (openai.Message{Role: "user", Content: "Q?"}) {
		t.Fatalf("unexpected conversation: %+v", messages[2:])
	}
}

func decode(t *testing.T, raw string) any {
	t.Helper()
	d := json.NewDecoder(bytes.NewReader([]byte(raw)))
	d.UseNumber()
	var v any
	if err := d.Decode(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestParseChatRequest(t *testing.T) {
	const ids = `"conversationId":"0b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90","turnId":"1b6d3f0e-6f3a-4c1e-9a55-2f5d8c7e1a90"`
	valid := `{"messages":[{"role":"user","content":"hi"}],"improvementLogging":true,` + ids + `}`
	req, _, fields := parseChatRequest(decode(t, valid))
	if fields != nil || req.mode != "hybrid" || req.limit != 8 {
		t.Fatalf("valid request rejected: %v %+v", fields, req)
	}

	invalidCases := map[string]string{
		`{"messages":[]}`: "messages",
		`{"messages":[{"role":"assistant","content":"x"}],"improvementLogging":true,` + ids + `}`:           "messages",
		`{"messages":[{"role":"user","content":"x"}],"improvementLogging":false,` + ids + `}`:               "improvementLogging",
		`{"messages":[{"role":"user","content":"x"}],"improvementLogging":true,"limit":2.5,` + ids + `}`:    "limit",
		`{"messages":[{"role":"user","content":"x"}],"improvementLogging":true,"mode":"magic",` + ids + `}`: "mode",
		`{"messages":[{"role":"user","content":"x"}],"improvementLogging":true,"conversationId":"nope"}`:    "logging",
	}
	for raw, field := range invalidCases {
		if _, _, fields := parseChatRequest(decode(t, raw)); fields[field] == nil {
			t.Errorf("expected %s error for %s, got %v", field, raw, fields)
		}
	}
}
