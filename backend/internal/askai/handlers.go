package askai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/daveclinton/portfolio/backend/internal/httpx"
	"github.com/daveclinton/portfolio/backend/internal/openai"
)

const (
	maxTurns              = 12
	maxMessageChars       = 8_000
	maxConversationChars  = 24_000
	maxChatRequestBytes   = 32_000
	maxSearchRequestBytes = 12_000
	maxOutputTokens       = 500
	chatTimeout           = 60 * time.Second
	searchTimeout         = 30 * time.Second

	missingKeyDetail       = "OPENAI_API_KEY is not configured on the server, so grounded answers cannot be generated"
	creditsExhaustedDetail = "My OpenAI credits are exhausted. While I top them up, you can contact me or explore the homepage."
	generationFailedDetail = "Ask AI could not complete that response. Please try again later, contact me, or explore the homepage."
)

type chatTurn struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	messages       []chatTurn
	mode           string
	limit          int
	conversationID string
	turnID         string
}

type fieldErrors map[string][]string

func invalid(field, message string) fieldErrors { return fieldErrors{field: {message}} }

// intField reads an optional integer between lo and hi.
func intField(payload map[string]any, key string, fallback, lo, hi int) (int, bool) {
	raw, present := payload[key]
	if !present || raw == nil {
		return fallback, true
	}
	number, ok := raw.(json.Number)
	if !ok {
		return 0, false
	}
	value, err := number.Int64()
	if err != nil || value < int64(lo) || value > int64(hi) {
		return 0, false
	}
	return int(value), true
}

func modeField(payload map[string]any) (string, bool) {
	raw, present := payload["mode"]
	if !present || raw == nil {
		return "hybrid", true
	}
	mode, ok := raw.(string)
	return mode, ok && slices.Contains(Modes, mode)
}

func parseChatRequest(body any) (*chatRequest, string, fieldErrors) {
	payload, ok := body.(map[string]any)
	if !ok {
		return nil, "request body must be a JSON object", nil
	}
	const detail = "invalid request"

	rawMessages, ok := payload["messages"].([]any)
	if !ok || len(rawMessages) == 0 {
		return nil, detail, invalid("messages", "at least one message is required")
	}
	if len(rawMessages) > maxTurns {
		return nil, detail, invalid("messages", fmt.Sprintf("conversation is too long (max %d turns)", maxTurns))
	}
	req := &chatRequest{}
	total := 0
	for _, raw := range rawMessages {
		turn, ok := raw.(map[string]any)
		if !ok {
			return nil, detail, invalid("messages", "each message needs a role and content")
		}
		role, _ := turn["role"].(string)
		if role != "user" && role != "assistant" {
			return nil, detail, invalid("messages", "role must be user or assistant")
		}
		content, ok := turn["content"].(string)
		if !ok || strings.TrimSpace(content) == "" {
			return nil, detail, invalid("messages", "content must not be blank")
		}
		if length := len([]rune(content)); length > maxMessageChars {
			return nil, detail, invalid("messages", fmt.Sprintf("content is too long (max %d chars)", maxMessageChars))
		} else {
			total += length
		}
		req.messages = append(req.messages, chatTurn{Role: role, Content: content})
	}
	if total > maxConversationChars {
		return nil, detail, invalid("messages", fmt.Sprintf("conversation is too large (max %d chars)", maxConversationChars))
	}
	if req.messages[len(req.messages)-1].Role != "user" {
		return nil, detail, invalid("messages", "the last message must come from the user")
	}

	if req.mode, ok = modeField(payload); !ok {
		return nil, detail, invalid("mode", "mode must be one of "+strings.Join(Modes, ", "))
	}
	if req.limit, ok = intField(payload, "limit", 8, 1, 20); !ok {
		return nil, detail, invalid("limit", "limit must be an integer between 1 and 20")
	}
	if consent, _ := payload["improvementLogging"].(bool); !consent {
		return nil, detail, invalid("improvementLogging", "conversation-storage consent is required to use Ask AI")
	}
	req.conversationID, _ = payload["conversationId"].(string)
	req.turnID, _ = payload["turnId"].(string)
	if !httpx.IsUUID(req.conversationID) || !httpx.IsUUID(req.turnID) {
		return nil, detail, invalid("logging", "valid conversationId and turnId UUIDs are required")
	}
	return req, "", nil
}

func writeBodyError(w http.ResponseWriter, err error) {
	if errors.Is(err, httpx.ErrBodyTooLarge) {
		httpx.BadRequest(w, "request body is too large", nil)
		return
	}
	httpx.BadRequest(w, "request body must be valid JSON", nil)
}

// handleChat answers one question as a Server-Sent Events stream:
// retrieval → citations → delta… → done (or error → done).
func (s *Service) handleChat(w http.ResponseWriter, r *http.Request) {
	started := time.Now()
	g := s.enforce(w, r, s.limits.chat)
	if !g.allowed {
		writeRateLimited(w, g)
		return
	}

	body, err := httpx.ReadJSON(r, maxChatRequestBytes)
	if err != nil {
		writeBodyError(w, err)
		return
	}
	req, detail, fields := parseChatRequest(body)
	if req == nil {
		if fields == nil {
			httpx.BadRequest(w, detail, nil)
		} else {
			httpx.BadRequest(w, detail, fields)
		}
		return
	}

	question := req.messages[len(req.messages)-1].Content
	history := req.messages[:len(req.messages)-1]
	reqCtx := s.requestContext(r)
	entry := turnLog{requestContext: reqCtx, ConversationID: req.conversationID, TurnID: req.turnID, Question: question}

	// Small talk is answered without retrieval or a model call.
	if reply := conversationalReply(question); reply != "" {
		entry.Answer, entry.Status, entry.Intent = reply, "completed", "general"
		entry.IntentSource, entry.IntentConfidence = "rules", 1
		entry.LatencyMs = time.Since(started).Milliseconds()
		s.goBackground(func(ctx context.Context) { s.storeAndAlert(ctx, entry) })

		stream := httpx.StartSSE(w)
		_ = stream.Send("retrieval", map[string]any{
			"notes":      []string{"Handled by the conversational workflow."},
			"strategies": map[string]int{"conversational": 1},
			"intent":     "general",
		})
		_ = stream.Send("citations", map[string]any{"sources": []source{}})
		_ = stream.Send("delta", map[string]string{"text": reply})
		_ = stream.Send("done", map[string]string{"finish_reason": "conversation"})
		return
	}

	// One answer per visitor at a time keeps costs predictable.
	token, ok := s.acquireChatLock(g.visitorID)
	if !ok {
		w.Header().Set("Retry-After", "2")
		httpx.WriteJSON(w, http.StatusTooManyRequests, httpx.Problem{Detail: "A response is already being generated. Please wait for it to finish."})
		return
	}
	defer s.releaseChatLock(g.visitorID, token)

	// The request context is cancelled if the visitor closes the tab, which
	// also cancels the OpenAI calls below so we stop paying for tokens.
	ctx, cancel := context.WithTimeout(r.Context(), chatTimeout)
	defer cancel()

	decision := s.classify(ctx, question, history)
	outcome, err := s.search(ctx, question, searchOptions{
		Mode: req.mode, Limit: req.limit, IncludeContent: true,
		Intent: &decision.Intent, RetrievalQueries: decision.Plan.RetrievalQueries,
	})
	if err != nil {
		s.log.Error("chat retrieval failed", "err", err)
		httpx.WriteJSON(w, http.StatusInternalServerError, httpx.Problem{Detail: "The assistant could not retrieve an answer."})
		return
	}
	sources := buildSources(outcome.Results)

	entry.Status = "error"
	entry.Intent = outcome.Intent
	entry.IntentSource = decision.Source
	entry.IntentConfidence = decision.Confidence
	entry.SourceCount = len(sources)
	defer func() {
		entry.LatencyMs = time.Since(started).Milliseconds()
		s.goBackground(func(ctx context.Context) { s.storeAndAlert(ctx, entry) })
	}()

	stream := httpx.StartSSE(w)
	_ = stream.Send("retrieval", map[string]any{
		"notes":      append(outcome.Notes, decision.notes()...),
		"strategies": outcome.Strategies,
		"intent":     outcome.Intent,
	})
	_ = stream.Send("citations", map[string]any{"sources": sources})

	fail := func(detail string) {
		entry.Answer = detail
		_ = stream.Send("error", map[string]string{"detail": detail})
		_ = stream.Send("done", map[string]string{"finish_reason": "error"})
	}

	knowledge := s.knowledge.Load()
	if knowledge == nil && len(sources) == 0 {
		entry.Answer, entry.Status = noEvidenceMessage, "no_evidence"
		_ = stream.Send("delta", map[string]string{"text": noEvidenceMessage})
		_ = stream.Send("done", map[string]string{"finish_reason": "no_evidence"})
		return
	}
	if !s.ai.Enabled() {
		fail(missingKeyDetail)
		return
	}
	referenceMaterial := strings.TrimSpace(siteFacts)
	if knowledge != nil {
		referenceMaterial = knowledge.text
	}

	var answer strings.Builder
	entry.Model = s.cfg.OpenAIChatModel
	usage, err := s.ai.StreamChat(ctx, openai.ChatRequest{
		Model:       s.cfg.OpenAIChatModel,
		Messages:    buildMessages(question, referenceMaterial, sources, history, decision),
		Temperature: 0.2,
		MaxTokens:   maxOutputTokens,
	}, func(text string) error {
		answer.WriteString(text)
		return stream.Send("delta", map[string]string{"text": text})
	})
	entry.Answer = answer.String()
	if err != nil {
		s.log.Error("chat generation failed", "err", err)
		if isCreditExhaustion(err) {
			fail(creditsExhaustedDetail)
		} else {
			fail(generationFailedDetail)
		}
		return
	}
	entry.Status = "completed"
	s.log.Info("answer generated", "model", s.cfg.OpenAIChatModel,
		"prompt_tokens", usage.PromptTokens, "cached_tokens", usage.Details.CachedTokens,
		"completion_tokens", usage.CompletionTokens)
	_ = stream.Send("done", map[string]string{"finish_reason": "stop"})
}

func parseFilters(raw any) (*Filters, fieldErrors) {
	if raw == nil {
		return nil, nil
	}
	object, ok := raw.(map[string]any)
	if !ok {
		return nil, invalid("filters", "filters must be an object")
	}
	var filters Filters
	for _, key := range filterKeys {
		value, present := object[key]
		if !present {
			continue
		}
		items, isList := value.([]any)
		if !isList {
			items = []any{value}
		}
		values := make([]string, 0, len(items))
		for _, item := range items {
			text, ok := item.(string)
			if !ok || len([]rune(text)) > 200 {
				return nil, invalid("filters", key+" must be a list of strings (max 200 chars)")
			}
			values = append(values, text)
		}
		*filters.field(key) = values
	}
	return &filters, nil
}

func (s *Service) handleSearch(w http.ResponseWriter, r *http.Request) {
	g := s.enforce(w, r, s.limits.search)
	if !g.allowed {
		writeRateLimited(w, g)
		return
	}
	body, err := httpx.ReadJSON(r, maxSearchRequestBytes)
	if err != nil {
		writeBodyError(w, err)
		return
	}
	payload, ok := body.(map[string]any)
	if !ok {
		httpx.BadRequest(w, "request body must be a JSON object", nil)
		return
	}
	const detail = "invalid request"

	rawQuery, ok := payload["query"].(string)
	if !ok || len([]rune(rawQuery)) > 4000 {
		httpx.BadRequest(w, detail, invalid("query", "query must be a string (max 4000 chars)"))
		return
	}
	query := strings.TrimSpace(rawQuery)
	filters, fields := parseFilters(payload["filters"])
	if fields != nil {
		httpx.BadRequest(w, detail, fields)
		return
	}
	if query == "" && filters == nil {
		httpx.BadRequest(w, detail, invalid("non_field_errors", "provide a query, at least one filter, or both"))
		return
	}
	mode, ok := modeField(payload)
	if !ok {
		httpx.BadRequest(w, detail, invalid("mode", "mode must be one of "+strings.Join(Modes, ", ")))
		return
	}
	limit, ok := intField(payload, "limit", 10, 1, 50)
	if !ok {
		httpx.BadRequest(w, detail, invalid("limit", "limit must be an integer between 1 and 50"))
		return
	}
	includeContent := true
	if raw, present := payload["include_content"]; present && raw != nil {
		if includeContent, ok = raw.(bool); !ok {
			httpx.BadRequest(w, detail, invalid("include_content", "include_content must be a boolean"))
			return
		}
	}

	ctx, cancel := context.WithTimeout(r.Context(), searchTimeout)
	defer cancel()
	opts := searchOptions{Mode: mode, Limit: limit, IncludeContent: includeContent}
	if filters != nil {
		opts.Filters = *filters
	}
	outcome, err := s.search(ctx, query, opts)
	if err != nil {
		s.log.Error("search retrieval failed", "err", err)
		httpx.WriteJSON(w, http.StatusInternalServerError, httpx.Problem{Detail: "Search could not retrieve results."})
		return
	}
	httpx.WriteJSON(w, http.StatusOK, outcome)
}
