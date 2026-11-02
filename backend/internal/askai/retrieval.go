package askai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"slices"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

var Modes = []string{"structured", "semantic", "hybrid"}

const (
	candidateMultiplier = 4
	minCandidatePool    = 20
	rrfK                = 60
)

// semanticUnavailable means semantic search can't run right now; hybrid
// search records the reason and carries on with structured results.
type semanticUnavailable struct{ reason string }

func (e *semanticUnavailable) Error() string { return e.reason }

type Filters struct {
	SourceType  []string `json:"source_type"`
	SourceGroup []string `json:"source_group"`
	ProjectSlug []string `json:"project_slug"`
	CompanySlug []string `json:"company_slug"`
	SkillSlug   []string `json:"skill_slug"`
}

var filterKeys = []string{"source_type", "source_group", "project_slug", "company_slug", "skill_slug"}

func (f *Filters) field(key string) *[]string {
	switch key {
	case "source_type":
		return &f.SourceType
	case "source_group":
		return &f.SourceGroup
	case "project_slug":
		return &f.ProjectSlug
	case "company_slug":
		return &f.CompanySlug
	default:
		return &f.SkillSlug
	}
}

// cleaned trims every value, drops empties and makes nil lists empty so the
// JSON response always contains arrays.
func (f Filters) cleaned() Filters {
	var out Filters
	for _, key := range filterKeys {
		values := []string{}
		for _, v := range *f.field(key) {
			if v = strings.TrimSpace(v); v != "" {
				values = append(values, v)
			}
		}
		*out.field(key) = values
	}
	return out
}

// sqlBuilder collects positional parameters while a query is assembled.
type sqlBuilder struct{ params []any }

func (b *sqlBuilder) arg(value any) string {
	b.params = append(b.params, value)
	return "$" + strconv.Itoa(len(b.params))
}

func (b *sqlBuilder) filterClauses(f Filters) []string {
	var clauses []string
	if len(f.SourceType) > 0 {
		clauses = append(clauses, "source_type = ANY("+b.arg(f.SourceType)+")")
	}
	if len(f.SourceGroup) > 0 {
		clauses = append(clauses, "(metadata ->> 'source_group') = ANY("+b.arg(f.SourceGroup)+")")
	}
	if len(f.ProjectSlug) > 0 {
		clauses = append(clauses, "project_slug = ANY("+b.arg(f.ProjectSlug)+")")
	}
	if len(f.CompanySlug) > 0 {
		clauses = append(clauses, "company_slug = ANY("+b.arg(f.CompanySlug)+")")
	}
	if len(f.SkillSlug) > 0 {
		clauses = append(clauses, "skill_slug = ANY("+b.arg(f.SkillSlug)+")")
	}
	return clauses
}

type chunk struct {
	ID          int64
	Content     string
	SourceType  string
	SourcePath  string
	CompanySlug string
	ProjectSlug string
	SkillSlug   string
	Metadata    map[string]any
}

const chunkColumns = `id, COALESCE(content, ''), COALESCE(source_type, ''), COALESCE(source_path, ''),
	COALESCE(company_slug, ''), COALESCE(project_slug, ''), COALESCE(skill_slug, ''),
	COALESCE(metadata, '{}'::jsonb)`

// scanChunks reads rows that start with chunkColumns; extra receives any
// trailing columns (rank or distance) for each row.
func scanChunks(rows pgx.Rows, extra func() []any) ([]chunk, error) {
	defer rows.Close()
	var out []chunk
	for rows.Next() {
		var c chunk
		var metadata []byte
		dest := []any{&c.ID, &c.Content, &c.SourceType, &c.SourcePath,
			&c.CompanySlug, &c.ProjectSlug, &c.SkillSlug, &metadata}
		if extra != nil {
			dest = append(dest, extra()...)
		}
		if err := rows.Scan(dest...); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(metadata, &c.Metadata); err != nil || c.Metadata == nil {
			c.Metadata = map[string]any{}
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Service) searchStructured(ctx context.Context, query string, filters Filters, limit int) ([]chunk, error) {
	var b sqlBuilder
	clauses := b.filterClauses(filters)
	terms := tokenize(query)
	if len(terms) == 0 {
		where := ""
		if len(clauses) > 0 {
			where = "WHERE " + strings.Join(clauses, " AND ")
		}
		sql := fmt.Sprintf("SELECT %s FROM knowledge_knowledgechunk %s ORDER BY id ASC LIMIT %s",
			chunkColumns, where, b.arg(limit))
		rows, err := s.db.Query(ctx, sql, b.params...)
		if err != nil {
			return nil, err
		}
		return scanChunks(rows, nil)
	}

	parts := make([]string, len(terms))
	for i, term := range terms {
		parts[i] = "plainto_tsquery('english', " + b.arg(term) + ")"
	}
	tsquery := "(" + strings.Join(parts, " || ") + ")"
	rankExpr := "ts_rank(to_tsvector('english', content), " + tsquery + ")"
	clauses = append(clauses, "to_tsvector('english', content) @@ "+tsquery, rankExpr+" > 0")
	sql := fmt.Sprintf("SELECT %s, %s AS rank FROM knowledge_knowledgechunk WHERE %s ORDER BY rank DESC, id ASC LIMIT %s",
		chunkColumns, rankExpr, strings.Join(clauses, " AND "), b.arg(limit))
	rows, err := s.db.Query(ctx, sql, b.params...)
	if err != nil {
		return nil, err
	}
	return scanChunks(rows, func() []any { var rank float32; return []any{&rank} })
}

type scoredChunk struct {
	chunk    chunk
	distance float64
}

// searchSemantic embeds the contextual queries with the self-hosted model and
// finds the nearest chunks by cosine distance in pgvector, keeping each
// chunk's best distance across queries.
func (s *Service) searchSemantic(ctx context.Context, queries []string, filters Filters, limit int) ([]scoredChunk, error) {
	if !s.embedder.Enabled() {
		return nil, &semanticUnavailable{"semantic search is unavailable: EMBEDDINGS_URL is not configured"}
	}
	var count int
	if err := s.db.QueryRow(ctx, "SELECT COUNT(*)::int FROM "+embeddingTable+" WHERE model = $1",
		s.cfg.EmbeddingModel).Scan(&count); err != nil {
		return nil, err
	}
	if count == 0 {
		return nil, &semanticUnavailable{"semantic search is unavailable: knowledge chunks are still being embedded"}
	}

	inputs := make([]string, len(queries))
	for i, query := range queries {
		inputs[i] = s.cfg.EmbeddingQueryPrefix + query
	}
	vectors, err := s.embedder.Embed(ctx, inputs)
	if err != nil {
		return nil, &semanticUnavailable{"semantic search is unavailable: " + err.Error()}
	}

	best := map[int64]scoredChunk{}
	for _, vector := range vectors {
		hits, err := s.searchByVector(ctx, vector, filters, limit)
		if err != nil {
			return nil, err
		}
		for _, hit := range hits {
			if previous, ok := best[hit.chunk.ID]; !ok || hit.distance < previous.distance {
				best[hit.chunk.ID] = hit
			}
		}
	}
	merged := make([]scoredChunk, 0, len(best))
	for _, hit := range best {
		merged = append(merged, hit)
	}
	sort.SliceStable(merged, func(i, j int) bool {
		if merged[i].distance != merged[j].distance {
			return merged[i].distance < merged[j].distance
		}
		return merged[i].chunk.ID < merged[j].chunk.ID
	})
	if len(merged) > limit {
		merged = merged[:limit]
	}
	return merged, nil
}

func (s *Service) searchByVector(ctx context.Context, vector []float32, filters Filters, limit int) ([]scoredChunk, error) {
	var b sqlBuilder
	clauses := append([]string{"e.model = " + b.arg(s.cfg.EmbeddingModel)}, b.filterClauses(filters)...)
	vec := b.arg(vectorLiteral(vector)) + "::vector"
	sql := fmt.Sprintf(`SELECT %s, (e.embedding <=> %s) AS distance
		  FROM knowledge_knowledgechunk
		  JOIN %s e ON e.chunk_id = knowledge_knowledgechunk.id
		 WHERE %s
		 ORDER BY distance ASC, id ASC
		 LIMIT %s`,
		chunkColumns, vec, embeddingTable, strings.Join(clauses, " AND "), b.arg(limit))
	rows, err := s.db.Query(ctx, sql, b.params...)
	if err != nil {
		return nil, err
	}
	var distances []*float64
	chunks, err := scanChunks(rows, func() []any {
		d := new(float64)
		distances = append(distances, d)
		return []any{d}
	})
	if err != nil {
		return nil, err
	}
	out := make([]scoredChunk, len(chunks))
	for i, c := range chunks {
		out[i] = scoredChunk{chunk: c, distance: *distances[i]}
	}
	return out, nil
}

type EvidenceCitation struct {
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Claim        string `json:"claim"`
	EvidenceType string `json:"evidence_type"`
	Confidence   string `json:"confidence"`
	ProjectSlug  string `json:"project_slug"`
	CompanySlug  string `json:"company_slug"`
	SourceURL    string `json:"source_url"`
	SourcePath   string `json:"source_path"`
}

var confidenceOrder = map[string]int{"confirmed": 0, "probable": 1, "unverified": 2}

func distinct(chunks []chunk, pick func(chunk) string) []string {
	out := []string{}
	seen := map[string]bool{}
	for _, c := range chunks {
		if v := pick(c); v != "" && !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

func (s *Service) citationsForChunks(ctx context.Context, chunks []chunk) (map[int64][]EvidenceCitation, error) {
	projects := distinct(chunks, func(c chunk) string { return c.ProjectSlug })
	companies := distinct(chunks, func(c chunk) string { return c.CompanySlug })
	paths := distinct(chunks, func(c chunk) string { return c.SourcePath })
	if len(projects)+len(companies)+len(paths) == 0 {
		return map[int64][]EvidenceCitation{}, nil
	}
	rows, err := s.db.Query(ctx, `
		SELECT e.slug, COALESCE(e.claim, ''), COALESCE(e.confidence, ''), COALESCE(e.evidence_type, ''),
		       COALESCE(e.title, ''), COALESCE(e.source_url, ''), COALESCE(e.source_path, ''),
		       COALESCE(p.slug, ''), COALESCE(c.slug, '')
		  FROM knowledge_evidence e
		  LEFT JOIN knowledge_project p ON p.id = e.project_id
		  LEFT JOIN knowledge_employment em ON em.id = e.employment_id
		  LEFT JOIN knowledge_company c ON c.id = em.company_id
		 WHERE p.slug = ANY($1) OR c.slug = ANY($2) OR e.source_path = ANY($3)`,
		projects, companies, paths)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byProject := map[string][]EvidenceCitation{}
	byCompany := map[string][]EvidenceCitation{}
	byPath := map[string][]EvidenceCitation{}
	for rows.Next() {
		var e EvidenceCitation
		if err := rows.Scan(&e.Slug, &e.Claim, &e.Confidence, &e.EvidenceType, &e.Title,
			&e.SourceURL, &e.SourcePath, &e.ProjectSlug, &e.CompanySlug); err != nil {
			return nil, err
		}
		if e.Title == "" {
			e.Title = string([]rune(e.Claim)[:min(120, len([]rune(e.Claim)))])
		}
		if e.ProjectSlug != "" {
			byProject[e.ProjectSlug] = append(byProject[e.ProjectSlug], e)
		}
		if e.CompanySlug != "" {
			byCompany[e.CompanySlug] = append(byCompany[e.CompanySlug], e)
		}
		if e.SourcePath != "" {
			byPath[e.SourcePath] = append(byPath[e.SourcePath], e)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	resolved := map[int64][]EvidenceCitation{}
	for _, c := range chunks {
		candidates := map[string]EvidenceCitation{}
		var order []string
		for _, group := range [][]EvidenceCitation{byProject[c.ProjectSlug], byCompany[c.CompanySlug], byPath[c.SourcePath]} {
			for _, e := range group {
				if _, seen := candidates[e.Slug]; !seen {
					order = append(order, e.Slug)
				}
				candidates[e.Slug] = e
			}
		}
		list := make([]EvidenceCitation, 0, len(order))
		for _, slug := range order {
			list = append(list, candidates[slug])
		}
		sort.SliceStable(list, func(i, j int) bool {
			ci, ok := confidenceOrder[list[i].Confidence]
			if !ok {
				ci = 9
			}
			cj, ok := confidenceOrder[list[j].Confidence]
			if !ok {
				cj = 9
			}
			if ci != cj {
				return ci < cj
			}
			return list[i].Slug < list[j].Slug
		})
		resolved[c.ID] = list
	}
	return resolved, nil
}

func (s *Service) chunksBySourcePath(ctx context.Context, paths []string) (map[string]chunk, error) {
	out := map[string]chunk{}
	if len(paths) == 0 {
		return out, nil
	}
	rows, err := s.db.Query(ctx, "SELECT "+chunkColumns+" FROM knowledge_knowledgechunk WHERE source_path = ANY($1)", paths)
	if err != nil {
		return nil, err
	}
	chunks, err := scanChunks(rows, nil)
	if err != nil {
		return nil, err
	}
	for _, c := range chunks {
		if _, seen := out[c.SourcePath]; !seen {
			out[c.SourcePath] = c
		}
	}
	return out, nil
}

func (s *Service) confirmedMetricSlugs(ctx context.Context) (projects, companies []string, err error) {
	rows, err := s.db.Query(ctx, `
		SELECT COALESCE(p.slug, ''), COALESCE(c.slug, '')
		  FROM knowledge_evidence e
		  LEFT JOIN knowledge_project p ON p.id = e.project_id
		  LEFT JOIN knowledge_employment em ON em.id = e.employment_id
		  LEFT JOIN knowledge_company c ON c.id = em.company_id
		 WHERE e.confidence = 'confirmed' AND e.evidence_type = 'metric'`)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	seenProjects, seenCompanies := map[string]bool{}, map[string]bool{}
	for rows.Next() {
		var project, company string
		if err := rows.Scan(&project, &company); err != nil {
			return nil, nil, err
		}
		if project != "" && !seenProjects[project] {
			seenProjects[project] = true
			projects = append(projects, project)
		}
		if company != "" && !seenCompanies[company] {
			seenCompanies[company] = true
			companies = append(companies, company)
		}
	}
	return projects, companies, rows.Err()
}

type SearchResult struct {
	Rank           int                `json:"rank"`
	Score          float64            `json:"score"`
	MatchedBy      []string           `json:"matched_by"`
	StructuredRank *int               `json:"structured_rank"`
	SemanticRank   *int               `json:"semantic_rank"`
	Distance       *float64           `json:"distance"`
	ChunkID        int64              `json:"chunk_id"`
	SourceType     string             `json:"source_type"`
	SourceGroup    string             `json:"source_group"`
	SourcePath     string             `json:"source_path"`
	ProjectSlug    string             `json:"project_slug"`
	CompanySlug    string             `json:"company_slug"`
	SkillSlug      string             `json:"skill_slug"`
	Citations      []EvidenceCitation `json:"citations"`
	Content        *string            `json:"content,omitempty"`
}

type SearchOutcome struct {
	Query      string          `json:"query"`
	Mode       string          `json:"mode"`
	Count      int             `json:"count"`
	Filters    Filters         `json:"filters"`
	Strategies map[string]int  `json:"strategies"`
	Notes      []string        `json:"notes"`
	Intent     string          `json:"intent"`
	Results    []*SearchResult `json:"results"`
}

type searchOptions struct {
	Mode             string
	Filters          Filters
	Limit            int
	IncludeContent   bool
	Intent           *Intent
	RetrievalQueries []string
}

func round6(n float64) float64 { return math.Round(n*1e6) / 1e6 }

type resultFields struct {
	rank           int
	score          float64
	matchedBy      []string
	structuredRank *int
	semanticRank   *int
	distance       *float64
}

func toResult(c chunk, f resultFields, includeContent bool) *SearchResult {
	group, _ := c.Metadata["source_group"].(string)
	r := &SearchResult{
		Rank:           f.rank,
		Score:          round6(f.score),
		MatchedBy:      f.matchedBy,
		StructuredRank: f.structuredRank,
		SemanticRank:   f.semanticRank,
		ChunkID:        c.ID,
		SourceType:     c.SourceType,
		SourceGroup:    group,
		SourcePath:     c.SourcePath,
		ProjectSlug:    c.ProjectSlug,
		CompanySlug:    c.CompanySlug,
		SkillSlug:      c.SkillSlug,
		Citations:      []EvidenceCitation{},
	}
	if f.distance != nil {
		d := round6(*f.distance)
		r.Distance = &d
	}
	if includeContent {
		content := c.Content
		r.Content = &content
	}
	return r
}

func intPtr(v int) *int { return &v }

func distancePtr(distances map[int64]float64, id int64) *float64 {
	if d, ok := distances[id]; ok {
		return &d
	}
	return nil
}

// search runs structured (Postgres full-text) and/or semantic (vector)
// retrieval, fuses the rankings, reranks for the question's intent and
// attaches evidence citations.
func (s *Service) search(ctx context.Context, query string, opts searchOptions) (*SearchOutcome, error) {
	mode := opts.Mode
	if mode == "" {
		mode = "hybrid"
	}
	if !slices.Contains(Modes, mode) {
		return nil, fmt.Errorf("mode must be one of %s; got %q", strings.Join(Modes, ", "), mode)
	}
	if opts.Limit < 1 {
		return nil, errors.New("limit must be at least 1")
	}
	filters := opts.Filters.cleaned()
	intent := classifyByRules(query)
	if opts.Intent != nil {
		intent = *opts.Intent
	}
	queries := opts.RetrievalQueries
	if len(queries) == 0 {
		queries = []string{query}
	}
	queries = uniqueTrimmed(queries, 4)
	if len(queries) == 0 {
		queries = []string{query}
	}
	pool := max(opts.Limit*candidateMultiplier, minCandidatePool)
	notes := []string{}
	strategies := map[string]int{}
	var structuredRanked []chunk
	var semanticRanked []scoredChunk
	distances := map[int64]float64{}

	if mode == "structured" || mode == "hybrid" {
		var err error
		if structuredRanked, err = s.searchStructured(ctx, queries[0], filters, pool); err != nil {
			return nil, fmt.Errorf("structured search: %w", err)
		}
		strategies["structured"] = len(structuredRanked)
	}

	if mode == "semantic" || mode == "hybrid" {
		ranked, err := s.searchSemantic(ctx, queries, filters, pool)
		var unavailable *semanticUnavailable
		switch {
		case errors.As(err, &unavailable):
			strategies["semantic"] = 0
			notes = append(notes, unavailable.reason)
			if mode == "semantic" {
				return &SearchOutcome{Query: query, Mode: mode, Count: 0, Filters: filters,
					Strategies: strategies, Notes: notes, Intent: intent.Name, Results: []*SearchResult{}}, nil
			}
		case err != nil:
			return nil, fmt.Errorf("semantic search: %w", err)
		default:
			semanticRanked = ranked
			for _, hit := range ranked {
				distances[hit.chunk.ID] = hit.distance
			}
			strategies["semantic"] = len(ranked)
			if len(queries) > 1 {
				notes = append(notes, fmt.Sprintf("Semantic retrieval used %d contextual queries.", len(queries)))
			}
		}
	}

	chunksByID := map[int64]chunk{}
	for _, c := range structuredRanked {
		chunksByID[c.ID] = c
	}
	for _, hit := range semanticRanked {
		chunksByID[hit.chunk.ID] = hit.chunk
	}

	var ranked []*SearchResult
	switch mode {
	case "hybrid":
		ranked = fuse(structuredRanked, semanticRanked, distances, opts.IncludeContent)
	case "structured":
		for i, c := range structuredRanked {
			rank := i + 1
			ranked = append(ranked, toResult(c, resultFields{rank: rank, score: 1 / float64(rank),
				matchedBy: []string{"structured"}, structuredRank: intPtr(rank),
				distance: distancePtr(distances, c.ID)}, opts.IncludeContent))
		}
	case "semantic":
		for i, hit := range semanticRanked {
			rank := i + 1
			ranked = append(ranked, toResult(hit.chunk, resultFields{rank: rank, score: 1 / float64(rank),
				matchedBy: []string{"semantic"}, semanticRank: intPtr(rank),
				distance: distancePtr(distances, hit.chunk.ID)}, opts.IncludeContent))
		}
	}

	ranked, err := s.applyIntent(ctx, ranked, intent, opts.Limit, opts.IncludeContent, chunksByID)
	if err != nil {
		return nil, err
	}
	selected := make([]chunk, 0, len(ranked))
	for _, r := range ranked {
		selected = append(selected, chunksByID[r.ChunkID])
	}
	citations, err := s.citationsForChunks(ctx, selected)
	if err != nil {
		return nil, fmt.Errorf("citations: %w", err)
	}
	for _, r := range ranked {
		if list, ok := citations[r.ChunkID]; ok {
			r.Citations = list
		}
	}
	if ranked == nil {
		ranked = []*SearchResult{}
	}
	return &SearchOutcome{Query: query, Mode: mode, Count: len(ranked), Filters: filters,
		Strategies: strategies, Notes: notes, Intent: intent.Name, Results: ranked}, nil
}

func (s *Service) applyIntent(ctx context.Context, ranked []*SearchResult, intent Intent, limit int,
	includeContent bool, chunksByID map[int64]chunk) ([]*SearchResult, error) {
	var anchors []*SearchResult
	if len(intent.AnchorPaths) > 0 {
		byPath, err := s.chunksBySourcePath(ctx, intent.AnchorPaths)
		if err != nil {
			return nil, fmt.Errorf("anchor chunks: %w", err)
		}
		for _, path := range intent.AnchorPaths {
			c, ok := byPath[path]
			if !ok {
				continue
			}
			chunksByID[c.ID] = c
			idx := slices.IndexFunc(ranked, func(r *SearchResult) bool { return r.ChunkID == c.ID })
			if idx != -1 {
				anchors = append(anchors, ranked[idx])
				continue
			}
			anchors = append(anchors, toResult(c, resultFields{rank: 0, score: 1, matchedBy: []string{"intent"}}, includeContent))
		}
	}
	opts := rerankOptions{limit: limit, anchors: anchors}
	if intent.Name == "outcomes" {
		var err error
		if opts.metricProjectSlugs, opts.metricCompanySlugs, err = s.confirmedMetricSlugs(ctx); err != nil {
			return nil, fmt.Errorf("metric slugs: %w", err)
		}
	}
	return rerankForIntent(ranked, intent, opts), nil
}

type fusedHit struct {
	key   int64
	score float64
	ranks map[string]int
}

// reciprocalRankFusion scores each item by sum(1 / (k + rank)) across rankings.
func reciprocalRankFusion(rankings map[string][]int64) []*fusedHit {
	fused := map[int64]*fusedHit{}
	var order []*fusedHit
	for _, strategy := range []string{"structured", "semantic"} {
		for index, key := range rankings[strategy] {
			rank := index + 1
			hit, ok := fused[key]
			if !ok {
				hit = &fusedHit{key: key, ranks: map[string]int{}}
				fused[key] = hit
				order = append(order, hit)
			}
			hit.score += 1 / float64(rrfK+rank)
			hit.ranks[strategy] = rank
		}
	}
	sort.SliceStable(order, func(i, j int) bool {
		if order[i].score != order[j].score {
			return order[i].score > order[j].score
		}
		return strconv.FormatInt(order[i].key, 10) < strconv.FormatInt(order[j].key, 10)
	})
	return order
}

func fuse(structured []chunk, semantic []scoredChunk, distances map[int64]float64, includeContent bool) []*SearchResult {
	byID := map[int64]chunk{}
	rankings := map[string][]int64{}
	for _, c := range structured {
		byID[c.ID] = c
		rankings["structured"] = append(rankings["structured"], c.ID)
	}
	for _, hit := range semantic {
		byID[hit.chunk.ID] = hit.chunk
		rankings["semantic"] = append(rankings["semantic"], hit.chunk.ID)
	}
	var out []*SearchResult
	for index, hit := range reciprocalRankFusion(rankings) {
		matched := make([]string, 0, len(hit.ranks))
		for strategy := range hit.ranks {
			matched = append(matched, strategy)
		}
		sort.Strings(matched)
		fields := resultFields{rank: index + 1, score: hit.score, matchedBy: matched,
			distance: distancePtr(distances, hit.key)}
		if r, ok := hit.ranks["structured"]; ok {
			fields.structuredRank = intPtr(r)
		}
		if r, ok := hit.ranks["semantic"]; ok {
			fields.semanticRank = intPtr(r)
		}
		out = append(out, toResult(byID[hit.key], fields, includeContent))
	}
	return out
}
