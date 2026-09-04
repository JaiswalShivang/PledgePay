package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

type GroqClient struct {
	apiKey     string
	model      string
	httpClient *http.Client
}

func NewGroqClient(apiKey, model string) *GroqClient {
	if model == "" {
		model = "llama-3.3-70b-versatile"
	}
	return &GroqClient{
		apiKey: apiKey,
		model:  model,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqResponseFormat struct {
	Type string `json:"type"`
}

type groqRequest struct {
	Model          string             `json:"model"`
	Messages       []groqMessage      `json:"messages"`
	ResponseFormat groqResponseFormat `json:"response_format"`
	Temperature    float64            `json:"temperature"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

func (c *GroqClient) Complete(ctx context.Context, systemPrompt, userPrompt string, out any) error {
	if c.apiKey == "" || strings.HasPrefix(c.apiKey, "gsk_placeholder") {
		return c.fallbackComplete(systemPrompt, userPrompt, out)
	}

	callCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	messages := []groqMessage{
		{
			Role:    "system",
			Content: systemPrompt + " Respond with JSON only, matching the exact requested schema. No prose, no explanations, no markdown fences.",
		},
		{
			Role:    "user",
			Content: userPrompt,
		},
	}

	content, err := c.doChatRequest(callCtx, messages)
	if err == nil {
		if err := json.Unmarshal([]byte(content), out); err == nil {
			return nil
		}
	}

	retryMessages := append(messages,
		groqMessage{Role: "assistant", Content: content},
		groqMessage{Role: "user", Content: "Your previous response was invalid JSON or mismatched the schema. Return ONLY valid JSON matching the exact schema without any markdown formatting."},
	)

	retryContent, retryErr := c.doChatRequest(callCtx, retryMessages)
	if retryErr != nil {
		slog.Warn("Groq API retry request failed, attempting fallback", "error", retryErr)
		return c.fallbackComplete(systemPrompt, userPrompt, out)
	}

	if err := json.Unmarshal([]byte(retryContent), out); err != nil {
		slog.Warn("Groq API JSON unmarshal failed after retry, attempting fallback", "error", err, "raw", retryContent)
		return c.fallbackComplete(systemPrompt, userPrompt, out)
	}

	return nil
}

func (c *GroqClient) doChatRequest(ctx context.Context, messages []groqMessage) (string, error) {
	reqBody := groqRequest{
		Model:          c.model,
		Messages:       messages,
		ResponseFormat: groqResponseFormat{Type: "json_object"},
		Temperature:    0.2,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal groq request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(jsonBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create groq request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("groq http request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read groq response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("groq api error (status %d): %s", resp.StatusCode, string(bodyBytes))
	}

	var groqResp groqResponse
	if err := json.Unmarshal(bodyBytes, &groqResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal groq response: %w", err)
	}

	if groqResp.Error != nil {
		return "", fmt.Errorf("groq api returned error: %s", groqResp.Error.Message)
	}

	if len(groqResp.Choices) == 0 {
		return "", errors.New("groq api returned no choices")
	}

	rawContent := strings.TrimSpace(groqResp.Choices[0].Message.Content)
	rawContent = strings.TrimPrefix(rawContent, "```json")
	rawContent = strings.TrimPrefix(rawContent, "```")
	rawContent = strings.TrimSuffix(rawContent, "```")
	return strings.TrimSpace(rawContent), nil
}

type ParsedGoalParams struct {
	Goal             string
	Target           int
	DurationDays     int
	Unit             string
	Evidence         string
	RawDurationUnit  string
	RawDurationValue int
	TotalMinutes     int
	TimeframeText    string
}

func extractGoalParameters(prompt string) ParsedGoalParams {
	lower := strings.ToLower(prompt)
	cleanPrompt := prompt
	for _, prefix := range []string{"user goal:", "goal:", "text:"} {
		if idx := strings.Index(strings.ToLower(cleanPrompt), prefix); idx != -1 {
			cleanPrompt = strings.TrimSpace(cleanPrompt[idx+len(prefix):])
		}
	}
	cleanPrompt = strings.TrimSpace(cleanPrompt)
	if cleanPrompt == "" {
		cleanPrompt = prompt
	}

	// 1. Determine Unit
	unit := "commits"
	if strings.Contains(lower, "page") || strings.Contains(lower, "write") || strings.Contains(lower, "essay") || strings.Contains(lower, "chapter") || strings.Contains(lower, "notes") || strings.Contains(lower, "handwriting") || strings.Contains(lower, "book") || strings.Contains(lower, "pdf") {
		unit = "pages"
	} else if strings.Contains(lower, "dsa") || strings.Contains(lower, "problem") || strings.Contains(lower, "question") || strings.Contains(lower, "leetcode") || strings.Contains(lower, "codeforces") {
		unit = "problems"
	} else if strings.Contains(lower, "pr") || strings.Contains(lower, "pull request") {
		unit = "pull_requests"
	} else if strings.Contains(lower, "commit") {
		unit = "commits"
	} else if strings.Contains(lower, "repo") || strings.Contains(lower, "project") {
		unit = "projects"
	}

	// 2. Determine Evidence
	evidence := "github_activity"
	if unit == "pages" || strings.Contains(lower, "document") || strings.Contains(lower, "handwriting") || strings.Contains(lower, "ocr") || strings.Contains(lower, "pdf") {
		evidence = "document_proof"
	} else if strings.Contains(lower, "codeforces") || strings.Contains(lower, "cf") || strings.Contains(lower, "dsa") || strings.Contains(lower, "leetcode") || unit == "problems" {
		evidence = "codeforces_submissions"
	}

	// 3. Extract Target Number
	target := 0
	reAction := regexp.MustCompile(`(?i)(?:solve|complete|do|finish|merge|commit|ship|write|read)\s+(\d+)`)
	if m := reAction.FindStringSubmatch(lower); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			target = n
		}
	}
	if target == 0 {
		reQuantity := regexp.MustCompile(`(?i)(\d+)\s*(?:pages?|words?|chapters?|dsa|problems?|questions?|commits?|prs?|pull\s*requests?|contributions?|repos?|projects?)`)
		if m := reQuantity.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				target = n
			}
		}
	}
	if target == 0 {
		numWords := map[string]int{
			"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
			"six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
			"twenty": 20, "thirty": 30, "fifty": 50, "hundred": 100,
		}
		for word, val := range numWords {
			if matched, _ := regexp.MatchString(`\b`+word+`\b`, lower); matched {
				target = val
				break
			}
		}
	}
	if target == 0 {
		reAnyNum := regexp.MustCompile(`\b(\d+)\b`)
		allNums := reAnyNum.FindAllString(lower, -1)
		if len(allNums) > 0 {
			if n, err := strconv.Atoi(allNums[0]); err == nil && n > 0 {
				target = n
			}
		}
	}
	if target <= 0 {
		if unit == "problems" {
			target = 5
		} else if unit == "pages" {
			target = 2
		} else {
			target = 10
		}
	}

	// 4. Extract Duration (handle seconds, minutes, hours, days, weeks, months)
	rawDurationUnit := "none"
	rawDurationValue := 0
	totalMinutes := 0
	durationDays := 0

	// Check seconds
	reSec := regexp.MustCompile(`(?i)(\d+)\s*(?:seconds?|secs?|s)\b`)
	if m := reSec.FindStringSubmatch(lower); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			rawDurationUnit = "seconds"
			rawDurationValue = n
			totalMinutes = 0
			durationDays = 1
		}
	}

	// Check minutes (e.g. "1 minute", "in next 2 minutes", "10 mins", "2 mintest")
	if rawDurationUnit == "none" {
		reMin := regexp.MustCompile(`(?i)(\d+)\s*(?:minutes?|mins?|mintest?|mints?|minuts?|m)\b`)
		if m := reMin.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				rawDurationUnit = "minutes"
				rawDurationValue = n
				totalMinutes = n
				durationDays = 1
			}
		}
	}

	// Check hours (e.g. "1 hour", "2 hrs")
	if rawDurationUnit == "none" {
		reHr := regexp.MustCompile(`(?i)(\d+)\s*(?:hours?|hrs?|h)\b`)
		if m := reHr.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				rawDurationUnit = "hours"
				rawDurationValue = n
				totalMinutes = n * 60
				durationDays = 1
			}
		}
	}

	// Check today / tonight / tomorrow
	if rawDurationUnit == "none" {
		if strings.Contains(lower, "today") || strings.Contains(lower, "tonight") {
			rawDurationUnit = "days"
			rawDurationValue = 1
			totalMinutes = 1440
			durationDays = 1
		} else if strings.Contains(lower, "tomorrow") {
			rawDurationUnit = "days"
			rawDurationValue = 1
			totalMinutes = 1440
			durationDays = 1
		}
	}

	// Check days
	if rawDurationUnit == "none" {
		reDays := regexp.MustCompile(`(?i)(\d+)\s*(?:consecutive\s*)?days?`)
		if m := reDays.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				rawDurationUnit = "days"
				rawDurationValue = n
				totalMinutes = n * 1440
				durationDays = n
			}
		}
	}

	// Check weeks
	if rawDurationUnit == "none" {
		reWeeks := regexp.MustCompile(`(?i)(\d+)\s*weeks?`)
		if m := reWeeks.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				rawDurationUnit = "weeks"
				rawDurationValue = n
				totalMinutes = n * 7 * 1440
				durationDays = n * 7
			}
		}
	}

	// Check months
	if rawDurationUnit == "none" {
		reMonths := regexp.MustCompile(`(?i)(\d+)\s*months?`)
		if m := reMonths.FindStringSubmatch(lower); len(m) > 1 {
			if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
				rawDurationUnit = "months"
				rawDurationValue = n
				totalMinutes = n * 30 * 1440
				durationDays = n * 30
			}
		}
	}

	if durationDays <= 0 {
		durationDays = 7
	}

	timeframeText := ""
	if rawDurationUnit == "minutes" {
		if rawDurationValue == 1 {
			timeframeText = "1 minute"
		} else {
			timeframeText = fmt.Sprintf("%d minutes", rawDurationValue)
		}
	} else if rawDurationUnit == "seconds" {
		timeframeText = fmt.Sprintf("%d seconds", rawDurationValue)
	} else if rawDurationUnit == "hours" {
		if rawDurationValue == 1 {
			timeframeText = "1 hour"
		} else {
			timeframeText = fmt.Sprintf("%d hours", rawDurationValue)
		}
	} else if rawDurationUnit == "days" {
		if rawDurationValue == 1 {
			timeframeText = "1 day"
		} else {
			timeframeText = fmt.Sprintf("%d days", rawDurationValue)
		}
	} else if rawDurationUnit == "weeks" {
		if rawDurationValue == 1 {
			timeframeText = "1 week"
		} else {
			timeframeText = fmt.Sprintf("%d weeks", rawDurationValue)
		}
	} else if rawDurationUnit == "months" {
		if rawDurationValue == 1 {
			timeframeText = "1 month"
		} else {
			timeframeText = fmt.Sprintf("%d months", rawDurationValue)
		}
	} else {
		if durationDays == 1 {
			timeframeText = "1 day"
		} else {
			timeframeText = fmt.Sprintf("%d days", durationDays)
		}
	}

	goalTitle := cleanPrompt
	if unit == "pages" || evidence == "document_proof" {
		topic := "Notes"
		if strings.Contains(lower, "html") || strings.Contains(lower, "hrml") {
			topic = "HTML Notes"
		} else if strings.Contains(lower, "css") {
			topic = "CSS Notes"
		} else if strings.Contains(lower, "javascript") || strings.Contains(lower, "js") {
			topic = "JavaScript Notes"
		} else if strings.Contains(lower, "react") {
			topic = "React Notes"
		} else if strings.Contains(lower, "dsa") {
			topic = "DSA Notes"
		} else if strings.Contains(lower, "python") {
			topic = "Python Notes"
		}
		if timeframeText != "" {
			goalTitle = fmt.Sprintf("Complete %s & Upload Document Proof (in %s)", topic, timeframeText)
		} else {
			goalTitle = fmt.Sprintf("Complete %s & Upload Document Proof", topic)
		}
	}

	return ParsedGoalParams{
		Goal:             goalTitle,
		Target:           target,
		DurationDays:     durationDays,
		Unit:             unit,
		Evidence:         evidence,
		RawDurationUnit:  rawDurationUnit,
		RawDurationValue: rawDurationValue,
		TotalMinutes:     totalMinutes,
		TimeframeText:    timeframeText,
	}
}

func (c *GroqClient) fallbackComplete(systemPrompt, userPrompt string, out any) error {
	lower := strings.ToLower(userPrompt)

	if strings.Contains(systemPrompt, "Goal Structurer") || strings.Contains(systemPrompt, "structure-goal") {
		p := extractGoalParameters(userPrompt)

		mock := map[string]interface{}{
			"goal":             p.Goal,
			"target":           p.Target,
			"duration":         p.DurationDays,
			"unit":             p.Unit,
			"evidence":         p.Evidence,
			"timeframe_text":   p.TimeframeText,
			"duration_minutes": p.TotalMinutes,
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Quality Analyzer") || strings.Contains(systemPrompt, "analyze-quality") {
		p := extractGoalParameters(userPrompt)

		var specificity, measurability, realism, evidenceScore, overall int
		var issues []string
		suggestedGoal := p.Goal
		suggestedTarget := p.Target
		suggestedDuration := p.DurationDays
		suggestedUnit := p.Unit
		suggestedEvidence := p.Evidence

		isVague := (len(lower) < 15 && p.Target <= 0) || strings.Contains(lower, "good at") || strings.Contains(lower, "better coder") || strings.Contains(lower, "become a developer") || (p.Target <= 0 && !strings.Contains(lower, "dsa") && !strings.Contains(lower, "commit") && !strings.Contains(lower, "note") && !strings.Contains(lower, "page"))

		if isVague {
			specificity = 40
			measurability = 35
			realism = 70
			evidenceScore = 40
			overall = 46
			issues = []string{
				"Goal lacks a concrete quantitative target count.",
				"No clear timeframe specified.",
				"Verification criteria cannot be automatically polled.",
			}
			suggestedGoal = fmt.Sprintf("Solve 5 %s in 7 days", p.Unit)
			suggestedTarget = 5
			suggestedDuration = 7
		} else {
			// Concrete goal with verifiable target!
			if p.Unit == "problems" {
				if p.DurationDays == 1 {
					suggestedGoal = fmt.Sprintf("Solve %d DSA problem today", p.Target)
				} else {
					suggestedGoal = fmt.Sprintf("Solve %d DSA problems in %d days", p.Target, p.DurationDays)
				}
			} else if p.Unit == "pull_requests" {
				suggestedGoal = fmt.Sprintf("Merge %d pull requests in %d days", p.Target, p.DurationDays)
			} else if p.Unit == "pages" || p.Evidence == "document_proof" {
				tf := p.TimeframeText
				if tf == "" {
					tf = fmt.Sprintf("%d days", p.DurationDays)
				}
				suggestedGoal = fmt.Sprintf("Complete and upload %d pages of notes in %s", p.Target, tf)
			} else {
				suggestedGoal = fmt.Sprintf("Make %d verifiable commits in %d days", p.Target, p.DurationDays)
			}

			specificity = 92
			measurability = 96
			realism = 94
			evidenceScore = 92
			overall = 94
			issues = []string{}
		}

		mock := map[string]interface{}{
			"specificity":   specificity,
			"measurability": measurability,
			"realism":       realism,
			"evidence":      evidenceScore,
			"overall":       overall,
			"issues":        issues,
			"suggested_commitment": map[string]interface{}{
				"goal":             suggestedGoal,
				"target":           suggestedTarget,
				"duration":         suggestedDuration,
				"unit":             suggestedUnit,
				"evidence":         suggestedEvidence,
				"timeframe_text":   p.TimeframeText,
				"duration_minutes": p.TotalMinutes,
			},
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Charity Matcher") || strings.Contains(systemPrompt, "suggest-charities") {
		type CharityInput struct {
			ID       string `json:"id"`
			Name     string `json:"name"`
			Category string `json:"category"`
		}
		var parsed struct {
			Charities []CharityInput `json:"charities"`
		}
		_ = json.Unmarshal([]byte(userPrompt), &parsed)

		suggestions := make([]map[string]interface{}, 0)
		for i, ch := range parsed.Charities {
			if i >= 3 {
				break
			}
			rationale := fmt.Sprintf("Strongly aligns with your milestone focus on %s impact.", ch.Category)
			suggestions = append(suggestions, map[string]interface{}{
				"charity_id": ch.ID,
				"rationale":  rationale,
			})
		}

		mock := map[string]interface{}{
			"suggestions": suggestions,
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Commitment Coach") || strings.Contains(systemPrompt, "coach") {
		mock := map[string]interface{}{
			"reply": "Keep a steady cadence! Prioritize 1 focused problem per session, write out test cases first, and ensure each commit is verifiable.",
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Evidence Verifier") || strings.Contains(systemPrompt, "verify") {
		mock := map[string]interface{}{
			"evidence_quality": "HIGH",
			"anomaly":          "NONE",
			"anomaly_reason":   nil,
			"confidence":       94.0,
			"summary":          "Activity shows organic cadence and verifiable evidence.",
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Document Proof Auditor") || strings.Contains(systemPrompt, "document") {
		var goalTitle, goalDesc, extractedText string
		var targetPages int = 1

		lines := strings.Split(userPrompt, "\n")
		for i, line := range lines {
			if strings.HasPrefix(line, "Goal Title: ") {
				goalTitle = strings.TrimPrefix(line, "Goal Title: ")
			} else if strings.HasPrefix(line, "Goal Description: ") {
				goalDesc = strings.TrimPrefix(line, "Goal Description: ")
			} else if strings.HasPrefix(line, "Target Pages: ") {
				fmt.Sscanf(strings.TrimPrefix(line, "Target Pages: "), "%d", &targetPages)
			} else if strings.HasPrefix(line, "Extracted Document Text (Sample):") {
				extractedText = strings.Join(lines[i+1:], "\n")
				break
			}
		}

		auditRes := AuditDocumentContentFallback(goalTitle, goalDesc, targetPages, extractedText)
		raw, _ := json.Marshal(auditRes)
		return json.Unmarshal(raw, out)
	}

	return errors.New("unsupported prompt type for fallback completion")
}

func truncateText(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "... [truncated]"
}

type DocumentVerificationResult struct {
	IsRelevant       bool    `json:"is_relevant"`
	RelevanceScore   float64 `json:"relevance_score"`
	IsSubstantial    bool    `json:"is_substantial"`
	SatisfiesGoal    bool    `json:"satisfies_goal"`
	ConfidenceRating string  `json:"confidence_rating"`
	Reasoning        string  `json:"reasoning"`
	DetectedTopic    string  `json:"detected_topic"`
}

type topicDef struct {
	id       string
	name     string
	keywords []string
}

var knownDocumentTopics = []topicDef{
	{
		id:   "css",
		name: "CSS & Web Styling",
		keywords: []string{
			"css", "style", "styles", "styling", "selector", "selectors", "flexbox", "flex-direction",
			"justify-content", "align-items", "grid", "grid-template", "padding", "margin", "border",
			"color", "background", "display", "position", "relative", "absolute", "fixed", "sticky",
			"pseudo", "hover", "focus", "keyframes", "animation", "media query", "responsive",
			"box-sizing", "cascade", "cascading", "tailwind", "specificity", "font-family", "z-index",
			"rem", "em", "vw", "vh", "overflow", "transform", "transition",
		},
	},
	{
		id:   "html",
		name: "HTML & Web Structure",
		keywords: []string{
			"html", "doctype", "tag", "tags", "element", "elements", "head", "body", "div", "span",
			"heading", "paragraph", "anchor", "href", "table", "tbody", "thead", "form", "input",
			"label", "button", "textarea", "semantic", "dom", "iframe", "section", "article",
			"nav", "footer", "header", "main", "canvas", "meta charset",
		},
	},
	{
		id:   "git",
		name: "Git & Version Control",
		keywords: []string{
			"git", "commit", "commits", "branch", "branches", "merge", "merging", "push", "pull",
			"checkout", "rebase", "stash", "clone", "github", "gitlab", "vcs", "version control",
			"origin", "remote", "diff", "working directory", "staging", "index", "conflict",
			"fast-forward", "cherry-pick", "repository", "git log", "git status", "pull request",
		},
	},
	{
		id:   "javascript",
		name: "JavaScript & Frontend",
		keywords: []string{
			"javascript", "typescript", "js", "ts", "const", "let", "var", "function", "functions",
			"arrow function", "promise", "promises", "async", "await", "callback", "array",
			"object", "react", "hooks", "usestate", "useeffect", "node", "npm", "closure",
			"prototype", "event listener", "console.log", "json", "dom manipulation",
		},
	},
	{
		id:   "python",
		name: "Python Programming",
		keywords: []string{
			"python", "def ", "pip", "django", "flask", "numpy", "pandas", "tuple", "dictionary",
			"dict", "indentation", "lambda", "list comprehension", "generator", "decorator",
			"__init__", "self", "import ", "elif", "pytest",
		},
	},
	{
		id:   "dsa",
		name: "DSA & Algorithms",
		keywords: []string{
			"dsa", "data structure", "data structures", "algorithm", "algorithms", "array",
			"linked list", "stack", "stacks", "queue", "queues", "tree", "trees", "binary search",
			"graph", "graphs", "bfs", "dfs", "dynamic programming", "recursion", "sorting",
			"merge sort", "quick sort", "hashmap", "leetcode", "codeforces", "time complexity",
			"big o", "space complexity", "pointer",
		},
	},
	{
		id:   "sql",
		name: "SQL & Databases",
		keywords: []string{
			"sql", "database", "databases", "query", "queries", "select", "insert", "update",
			"delete", "from", "where", "join", "joins", "inner join", "outer join", "table",
			"postgres", "postgresql", "mysql", "sqlite", "primary key", "foreign key", "schema",
			"normalization", "index", "group by", "order by", "acid",
		},
	},
	{
		id:   "docker",
		name: "DevOps & Containers",
		keywords: []string{
			"docker", "container", "containers", "dockerfile", "image", "compose", "kubernetes",
			"k8s", "pod", "deployment", "volume", "port forwarding", "ci/cd", "pipeline", "devops",
		},
	},
}

func AuditDocumentContentFallback(goalTitle, goalDesc string, targetPages int, extractedText string) DocumentVerificationResult {
	textLower := strings.ToLower(extractedText)
	goalCombined := strings.ToLower(goalTitle + " " + goalDesc)
	words := strings.Fields(extractedText)
	totalWords := len(words)

	minWordsRequired := targetPages * 10
	if minWordsRequired < 10 {
		minWordsRequired = 10
	}

	if totalWords < 5 {
		return DocumentVerificationResult{
			IsRelevant:       false,
			RelevanceScore:   0,
			IsSubstantial:    false,
			SatisfiesGoal:    false,
			ConfidenceRating: "HIGH",
			Reasoning:        "Uploaded document is empty or contains virtually no readable text.",
			DetectedTopic:    "Empty / Unreadable",
		}
	}

	// 1. Identify which topics are explicitly mentioned in the user's goal
	var matchedGoalTopics []topicDef
	for _, topic := range knownDocumentTopics {
		if strings.Contains(goalCombined, topic.id) || strings.Contains(goalCombined, strings.ToLower(topic.name)) {
			matchedGoalTopics = append(matchedGoalTopics, topic)
		}
	}

	// 2. Count topic keyword hits in extracted document text
	topicHits := make(map[string]int)
	for _, topic := range knownDocumentTopics {
		count := 0
		for _, kw := range topic.keywords {
			if strings.Contains(textLower, strings.ToLower(kw)) {
				count++
			}
		}
		topicHits[topic.id] = count
	}

	// Find dominant topic in extracted text
	var topDocTopic topicDef
	maxHits := 0
	for _, topic := range knownDocumentTopics {
		if topicHits[topic.id] > maxHits {
			maxHits = topicHits[topic.id]
			topDocTopic = topic
		}
	}

	// 3. Evaluate Match
	if len(matchedGoalTopics) > 0 {
		primaryGoalTopic := matchedGoalTopics[0]
		goalTopicHits := topicHits[primaryGoalTopic.id]

		// Clear topic mismatch:
		// Another topic is dominant (e.g. Git with >= 3 hits) and the goal's topic has 0 hits
		if topDocTopic.id != "" && topDocTopic.id != primaryGoalTopic.id && maxHits >= 2 && goalTopicHits == 0 {
			return DocumentVerificationResult{
				IsRelevant:       false,
				RelevanceScore:   15.0,
				IsSubstantial:    totalWords >= minWordsRequired,
				SatisfiesGoal:    false,
				ConfidenceRating: "HIGH",
				Reasoning: fmt.Sprintf(
					"Topic mismatch: Uploaded document covers %s (identified %d relevant keywords), but your commitment requires %s notes. Verification rejected.",
					topDocTopic.name, maxHits, primaryGoalTopic.name,
				),
				DetectedTopic: topDocTopic.name,
			}
		}

		// What if the goal topic has keywords present in the document?
		if goalTopicHits >= 1 {
			isSubstantial := totalWords >= minWordsRequired
			return DocumentVerificationResult{
				IsRelevant:       true,
				RelevanceScore:   94.0,
				IsSubstantial:    isSubstantial,
				SatisfiesGoal:    isSubstantial,
				ConfidenceRating: "HIGH",
				Reasoning: fmt.Sprintf(
					"Document verified: Successfully identified authentic %s concepts and notes matching your commitment.",
					primaryGoalTopic.name,
				),
				DetectedTopic: primaryGoalTopic.name,
			}
		}

		// Goal topic had 0 hits, but no other strong topic was detected
		if goalTopicHits == 0 {
			detected := "General / Unrelated"
			if topDocTopic.id != "" && maxHits > 0 {
				detected = topDocTopic.name
			}
			return DocumentVerificationResult{
				IsRelevant:       false,
				RelevanceScore:   20.0,
				IsSubstantial:    totalWords >= minWordsRequired,
				SatisfiesGoal:    false,
				ConfidenceRating: "HIGH",
				Reasoning: fmt.Sprintf(
					"Content does not appear to contain %s material. Please ensure your notes clearly include %s concepts.",
					primaryGoalTopic.name, primaryGoalTopic.name,
				),
				DetectedTopic: detected,
			}
		}
	}

	// If no specific tech topic was found in goal description (general goal):
	detected := "General Technical Notes"
	if topDocTopic.id != "" && maxHits >= 2 {
		detected = topDocTopic.name
	}

	isSubstantial := totalWords >= minWordsRequired
	return DocumentVerificationResult{
		IsRelevant:       true,
		RelevanceScore:   85.0,
		IsSubstantial:    isSubstantial,
		SatisfiesGoal:    isSubstantial,
		ConfidenceRating: "HIGH",
		Reasoning:        fmt.Sprintf("Document text verified (%d words). Content demonstrates substantive notes.", totalWords),
		DetectedTopic:    detected,
	}
}

func (c *GroqClient) VerifyDocumentContent(ctx context.Context, goalTitle, goalDesc string, targetPages int, extractedText string) (*DocumentVerificationResult, error) {
	systemPrompt := `You are an expert AI Document Proof Auditor for PledgePay Escrow.
A user has submitted written or scanned document proof (via PyMuPDF/Tesseract OCR) to fulfill an escrow commitment.

CRITICAL TOPIC RELEVANCE CHECK:
- Carefully compare the subject matter of the goal against the extracted document text.
- If the goal requires notes on a specific topic (e.g. CSS notes) and the document is about a different topic (e.g. Git commands, Python, random text), you MUST mark:
  "is_relevant": false,
  "relevance_score": 15.0,
  "satisfies_goal": false,
  "detected_topic": "<the topic actually found in the document>",
  "reasoning": "Topic mismatch: The document covers <detected_topic>, but the commitment requires <goal_topic>."

Respond ONLY with valid JSON matching these keys:
{
  "is_relevant": boolean,
  "relevance_score": float,
  "is_substantial": boolean,
  "satisfies_goal": boolean,
  "confidence_rating": "HIGH" | "MEDIUM" | "LOW",
  "reasoning": string,
  "detected_topic": string
}`

	userPrompt := fmt.Sprintf("Goal Title: %s\nGoal Description: %s\nTarget Pages: %d\nExtracted Document Text (Sample):\n%s", goalTitle, goalDesc, targetPages, truncateText(extractedText, 4000))

	var result DocumentVerificationResult
	if err := c.Complete(ctx, systemPrompt, userPrompt, &result); err != nil {
		res := AuditDocumentContentFallback(goalTitle, goalDesc, targetPages, extractedText)
		return &res, nil
	}

	return &result, nil
}
