package askai

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/daveclinton/portfolio/backend/internal/openai"
)

type responsePlan struct {
	Subject            string
	Goal               string
	Requirements       []string
	MissingInformation []string
	RetrievalQueries   []string
	ResponseMode       string // answer | fit_assessment | clarify
}

type intentDecision struct {
	Intent     Intent
	Source     string // rules | model | fallback
	Confidence float64
	Plan       responsePlan
}

// Strict structured outputs need every property listed in "required" and
// additionalProperties set to false. Bounds are enforced in Go afterwards.
var intentSchema = map[string]any{
	"type":                 "object",
	"additionalProperties": false,
	"required": []string{"intent", "confidence", "subject", "goal", "requirements",
		"missing_information", "retrieval_queries", "response_mode"},
	"properties": map[string]any{
		"intent":              map[string]any{"type": "string", "enum": IntentNames},
		"confidence":          map[string]any{"type": "number"},
		"subject":             map[string]any{"type": "string", "enum": []string{"candidate", "other", "unclear"}},
		"goal":                map[string]any{"type": "string", "enum": []string{"learn", "evaluate_fit", "compare", "pricing", "contact", "other"}},
		"requirements":        map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
		"missing_information": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
		"retrieval_queries":   map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
		"response_mode":       map[string]any{"type": "string", "enum": []string{"answer", "fit_assessment", "clarify"}},
	},
}

const classifierPrompt = `Plan retrieval and response behavior for a software engineer's portfolio assistant.

Resolve the current message using the recent conversation. Pronouns such as "he",
"him", and "his" normally refer to the candidate. Return 1-4 standalone retrieval
queries that search for evidence, not an answer. For suitability questions, search
for demonstrated capabilities, relevant projects, and outcomes. Never treat a
candidate-focused question as out of scope merely because role requirements are missing.

Choose one coarse intent only as a retrieval and reranking hint:
- biography: who the engineer is or what they do overall
- rates: price, rate, compensation, cost, or availability for paid work
- experience: employers, roles, responsibilities, career history, or work background
- projects: named or representative products, systems, or things built
- skills: demonstrated abilities, strengths, suitability, or whether they can do something
- technologies: specific languages, frameworks, databases, platforms, or tools
- outcomes: results, impact, metrics, improvements, scale, or operational effects
- general: anything else or a question too unclear to place reliably

Response modes:
- answer: enough context exists for a grounded factual answer
- fit_assessment: assess demonstrated suitability without making a hiring decision
- clarify: useful evidence can be summarized, but a focused answer needs missing criteria

Classify the actual goal rather than matching one word. "Can David use Power BI?"
is skills, while "Which data tools has David used?" is technologies. "Should I hire
him?" is skills + evaluate_fit + fit_assessment, and the missing job description
belongs in missing_information. Do not answer the question.`

type classifiedIntent struct {
	Intent             string   `json:"intent"`
	Confidence         float64  `json:"confidence"`
	Subject            string   `json:"subject"`
	Goal               string   `json:"goal"`
	Requirements       []string `json:"requirements"`
	MissingInformation []string `json:"missing_information"`
	RetrievalQueries   []string `json:"retrieval_queries"`
	ResponseMode       string   `json:"response_mode"`
}

// classify uses a small model to plan retrieval, falling back to the rules
// whenever the model is unavailable or returns something unusable.
func (s *Service) classify(ctx context.Context, question string, history []chatTurn) intentDecision {
	ruleIntent := classifyByRules(question)
	goal := "learn"
	if ruleIntent.Name == "rates" {
		goal = "pricing"
	}
	fallback := intentDecision{
		Intent: ruleIntent,
		Source: "fallback",
		Plan: responsePlan{Subject: "candidate", Goal: goal, Requirements: []string{},
			MissingInformation: []string{}, RetrievalQueries: []string{question}, ResponseMode: "answer"},
	}
	if !s.ai.Enabled() {
		return fallback
	}

	recent := history[max(0, len(history)-4):]
	lines := make([]string, len(recent))
	for i, turn := range recent {
		lines[i] = turn.Role + ": " + turn.Content
	}
	prompt := "Current question: " + question
	if len(lines) > 0 {
		prompt = "Recent conversation:\n" + strings.Join(lines, "\n") + "\n\n" + prompt
	}

	var out classifiedIntent
	err := s.ai.Structured(ctx, openai.StructuredRequest{
		Model:       s.cfg.OpenAIIntentModel,
		System:      classifierPrompt,
		User:        prompt,
		SchemaName:  "portfolio_question_intent",
		Schema:      intentSchema,
		Temperature: 0,
		MaxTokens:   350,
	}, &out)
	if err == nil && (!isIntentName(out.Intent) || math.IsNaN(out.Confidence) || len(out.RetrievalQueries) == 0) {
		err = errors.New("the classifier returned an invalid intent")
	}
	if err != nil {
		s.log.Warn("intent classification failed; using rules", "err", err)
		return fallback
	}

	confidence := math.Max(0, math.Min(1, out.Confidence))
	queries := uniqueTrimmed(out.RetrievalQueries, 4)
	if len(queries) == 0 {
		queries = []string{question}
	}
	decision := intentDecision{
		Intent:     ruleIntent,
		Source:     "model",
		Confidence: confidence,
		Plan: responsePlan{
			Subject:            out.Subject,
			Goal:               out.Goal,
			Requirements:       uniqueTrimmed(out.Requirements, 8),
			MissingInformation: uniqueTrimmed(out.MissingInformation, 5),
			RetrievalQueries:   queries,
			ResponseMode:       out.ResponseMode,
		},
	}
	if confidence >= 0.5 {
		decision.Intent = intentByName(out.Intent)
	}
	return decision
}

func (d intentDecision) notes() []string {
	return []string{
		fmt.Sprintf("Response plan selected by %s.", d.Source),
		fmt.Sprintf("Goal: %s; response mode: %s.", d.Plan.Goal, d.Plan.ResponseMode),
	}
}
