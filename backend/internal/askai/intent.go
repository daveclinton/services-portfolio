package askai

import (
	"regexp"
	"slices"
	"sort"
)

const profilePath = "knowledge/person/profile.md"

var IntentNames = []string{
	"general", "biography", "rates", "experience",
	"projects", "skills", "technologies", "outcomes",
}

type Intent struct {
	Name        string
	Guidance    string
	AnchorPaths []string
}

var generalIntent = Intent{
	Name:     "general",
	Guidance: "Answer the exact question directly and use only relevant retrieved facts.",
}

var intents = map[string]Intent{
	"biography": {
		Name: "biography",
		Guidance: "Lead with David's professional identity and the kinds of problems he solves. " +
			"Summarize representative verified contributions and outcomes. Mention a " +
			"technology only when it clarifies a contribution; do not answer with a stack list.",
		AnchorPaths: []string{profilePath},
	},
	"rates": {
		Name: "rates",
		Guidance: "State the applicable rates precisely, distinguish direct and marketplace " +
			"rates, and avoid unrelated career or technology detail.",
		AnchorPaths: []string{"knowledge/evidence/contracting-rate-2026.md", profilePath},
	},
	"experience": {
		Name: "experience",
		Guidance: "Prioritize roles, companies, responsibilities, dates and contributions. " +
			"Use projects and technologies only as supporting detail.",
		AnchorPaths: []string{profilePath},
	},
	"projects": {
		Name: "projects",
		Guidance: "Prioritize named products, the problem each solved, David's contribution, " +
			"delivery status and verified outcomes over raw technology inventories.",
	},
	"skills": {
		Name: "skills",
		Guidance: "Describe capabilities in terms of demonstrated work and representative " +
			"evidence, not an unexplained keyword list. For hiring, role-fit, or suitability " +
			"questions, explain where the evidence shows a strong fit, avoid making the " +
			"hiring decision for the user, and invite them to share the role requirements " +
			"for a more specific comparison.",
		AnchorPaths: []string{profilePath},
	},
	"technologies": {
		Name: "technologies",
		Guidance: "Answer with the relevant languages, frameworks, platforms or tools, grouped " +
			"by purpose and tied to verified usage where useful.",
	},
	"outcomes": {
		Name: "outcomes",
		Guidance: "Lead with measurable or operational results and clearly distinguish exact " +
			"metrics from qualitative outcomes.",
	},
}

func intentByName(name string) Intent {
	if intent, ok := intents[name]; ok {
		return intent
	}
	return generalIntent
}

func isIntentName(name string) bool { return slices.Contains(IntentNames, name) }

// Greetings and thanks are answered without retrieval or a model call.
var conversationalReplies = []struct {
	pattern  *regexp.Regexp
	response string
}{
	{regexp.MustCompile(`^(hi|hello|hey|hiya|howdy)( there)?[!.?]*$`),
		"Hi! I can answer questions about David's work, experience, projects, and skills. What would you like to know?"},
	{regexp.MustCompile(`^(good morning|good afternoon|good evening)[!.?]*$`),
		"Hello! Ask me anything about David's professional background, projects, or skills."},
	{regexp.MustCompile(`^(thanks|thank you|thank you very much|cheers)[!.?]*$`),
		"You're welcome. Feel free to ask another question about David's work."},
	{regexp.MustCompile(`^(how are you|how's it going|how are things)[!.?]*$`),
		"I'm ready to help. You can ask me about David's experience, projects, skills, or availability."},
}

// conversationalReply returns a canned reply for small talk, or "" to retrieve.
func conversationalReply(question string) string {
	text := normalize(question)
	for _, reply := range conversationalReplies {
		if reply.pattern.MatchString(text) {
			return reply.response
		}
	}
	return ""
}

// Order matters: the first intent whose pattern matches wins.
var orderedPatterns = []struct {
	name     string
	patterns []*regexp.Regexp
}{
	{"rates", compile(
		`\b(rate|rates|pricing|price|cost|charge|salary|compensation)\b`,
		`\bhow much\b`,
	)},
	{"outcomes", compile(
		`\b(impact|outcome|outcomes|result|results|metric|metrics)\b`,
		`\b(how many|improve[ds]?|automate[ds]?|saved|grew|growth)\b`,
	)},
	{"technologies", compile(
		`\b(tech stack|technology|technologies|framework|frameworks)\b`,
		`\b(language|languages|tool|tools|database|databases)\b`,
		`\b(react|next\.js|python|django|kotlin|flutter|rust|sap hana)\b`,
	)},
	{"skills", compile(
		`\b(skill|skills|expertise|speciali[sz]e[ds]?|capabilit(?:y|ies))\b`,
		`\b(good at|strong at|proficient|strengths?)\b`,
		`\b(hire|hiring|candidate|suitable|suitability|qualified|qualification|fit for|good fit)\b`,
	)},
	{"experience", compile(
		`\b(experience|experiences|experiance|experiances|career|employment|employer|company|companies|role|roles)\b`,
		`\b(worked at|work history|background|where (has|did) (he|david) work(?:ed)?)\b`,
	)},
	{"projects", compile(
		`\b(project|projects|product|products|portfolio|built|build|shipped)\b`,
		`\b(showcase|case stud(?:y|ies))\b`,
	)},
	{"biography", compile(
		`\bwho is david\b`,
		`\bwhat does david do\b`,
		`\bwhat can david do\b`,
		`\btell me about david\b`,
		`\btell me about you\b`,
		`\bwho are you\b`,
		`\btell me about (him|the candidate)\b`,
		`\b(introduce|summari[sz]e|overview) david\b`,
		`^what does (he|the candidate) do\??$`,
		`^who is (he|the candidate)\??$`,
	)},
}

func compile(patterns ...string) []*regexp.Regexp {
	out := make([]*regexp.Regexp, len(patterns))
	for i, p := range patterns {
		out[i] = regexp.MustCompile(p)
	}
	return out
}

// classifyByRules is the deterministic fast path for explicit wording.
func classifyByRules(question string) Intent {
	text := normalize(question)
	for _, entry := range orderedPatterns {
		for _, pattern := range entry.patterns {
			if pattern.MatchString(text) {
				return intents[entry.name]
			}
		}
	}
	return generalIntent
}

func sourcePriority(intent string, r *SearchResult) int {
	if intent == "biography" {
		if r.SourcePath == profilePath {
			return 0
		}
		switch r.SourceType {
		case "experience-overview":
			return 1
		case "project-overview":
			return 2
		case "experience-responsibilities":
			return 3
		case "skill":
			return 4
		case "project-evidence", "experience-accomplishments", "evidence":
			return 5
		case "experience-technologies":
			return 7
		default:
			return 6
		}
	}
	preferred := map[string][]string{
		"rates":        {"evidence", "person-profile"},
		"experience":   {"experience-overview", "experience-responsibilities"},
		"projects":     {"project-overview", "project-architecture", "project-technical-decisions"},
		"skills":       {"skill", "project-overview", "experience-responsibilities"},
		"technologies": {"experience-technologies", "project-overview", "skill"},
		"outcomes":     {"project-evidence", "experience-accomplishments", "evidence", "project-overview"},
	}
	order := preferred[intent]
	if index := slices.Index(order, r.SourceType); index != -1 {
		return index
	}
	return len(order) + 1
}

var biographyTypeCaps = map[string]int{
	"experience-overview":     3,
	"project-overview":        3,
	"skill":                   1,
	"experience-technologies": 1,
	"project-evidence":        1,
	"evidence":                1,
}

type rerankOptions struct {
	limit              int
	anchors            []*SearchResult
	metricProjectSlugs []string
	metricCompanySlugs []string
}

// rerankForIntent puts anchors first, then measured outcomes, then the source
// types the intent prefers, keeping retrieval order as the tie-breaker.
// Biography answers are diversified so one project can't fill every slot.
func rerankForIntent(results []*SearchResult, intent Intent, opts rerankOptions) []*SearchResult {
	byID := map[int64]*SearchResult{}
	var ordered []*SearchResult
	for _, r := range results {
		if _, seen := byID[r.ChunkID]; !seen {
			ordered = append(ordered, r)
		}
		byID[r.ChunkID] = r
	}
	var anchoredIDs []int64
	for _, anchor := range opts.anchors {
		if _, seen := byID[anchor.ChunkID]; !seen {
			byID[anchor.ChunkID] = anchor
			ordered = append(ordered, anchor)
		}
		anchoredIDs = append(anchoredIDs, anchor.ChunkID)
	}

	metricProjects := toSet(opts.metricProjectSlugs...)
	metricCompanies := toSet(opts.metricCompanySlugs...)
	metricPriority := func(r *SearchResult) int {
		if intent.Name != "outcomes" {
			return 0
		}
		if (r.ProjectSlug != "" && metricProjects[r.ProjectSlug]) ||
			(r.CompanySlug != "" && metricCompanies[r.CompanySlug]) {
			return 0
		}
		return 1
	}
	originalPosition := map[int64]int{}
	for i, r := range results {
		originalPosition[r.ChunkID] = i
	}
	position := func(id int64) int {
		if p, ok := originalPosition[id]; ok {
			return p
		}
		return -1
	}

	sort.SliceStable(ordered, func(i, j int) bool {
		a, b := ordered[i], ordered[j]
		anchorA, anchorB := slices.Index(anchoredIDs, a.ChunkID), slices.Index(anchoredIDs, b.ChunkID)
		if (anchorA == -1) != (anchorB == -1) {
			return anchorA != -1
		}
		if anchorA != anchorB {
			return anchorA < anchorB
		}
		if d := metricPriority(a) - metricPriority(b); d != 0 {
			return d < 0
		}
		if d := sourcePriority(intent.Name, a) - sourcePriority(intent.Name, b); d != 0 {
			return d < 0
		}
		return position(a.ChunkID) < position(b.ChunkID)
	})

	var selected []*SearchResult
	selectedIDs := map[int64]bool{}
	entityCounts := map[string]int{}
	typeCounts := map[string]int{}
	for _, r := range ordered {
		if len(selected) == opts.limit {
			break
		}
		entity := firstNonEmpty(r.ProjectSlug, r.CompanySlug, r.SkillSlug)
		if intent.Name == "biography" && !slices.Contains(anchoredIDs, r.ChunkID) {
			if entity != "" && entityCounts[entity] >= 1 {
				continue
			}
			typeCap, ok := biographyTypeCaps[r.SourceType]
			if !ok {
				typeCap = 2
			}
			if typeCounts[r.SourceType] >= typeCap {
				continue
			}
		}
		selected = append(selected, r)
		selectedIDs[r.ChunkID] = true
		if entity != "" {
			entityCounts[entity]++
		}
		typeCounts[r.SourceType]++
	}
	// Backfill with whatever the diversity caps skipped.
	for _, r := range ordered {
		if len(selected) == opts.limit {
			break
		}
		if !selectedIDs[r.ChunkID] {
			selected = append(selected, r)
			selectedIDs[r.ChunkID] = true
		}
	}
	for i, r := range selected {
		r.Rank = i + 1
	}
	return selected
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
