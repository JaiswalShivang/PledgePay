package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jaiswalshivang/pledgepay/internal/ai"
	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/repository"
	"golang.org/x/sync/errgroup"
)

type AIHandler struct {
	groqClient  *ai.GroqClient
	charityRepo repository.CharityRepository
}

func NewAIHandler(groqClient *ai.GroqClient, charityRepo repository.CharityRepository) *AIHandler {
	return &AIHandler{
		groqClient:  groqClient,
		charityRepo: charityRepo,
	}
}

type StructureGoalRequest struct {
	Text string `json:"text" binding:"required"`
}

type StructuredGoalResponse struct {
	Goal            string `json:"goal"`
	Target          int    `json:"target"`
	Duration        int    `json:"duration"`
	Unit            string `json:"unit"`
	Evidence        string `json:"evidence"`
	TimeframeText   string `json:"timeframe_text,omitempty"`
	DurationMinutes int    `json:"duration_minutes,omitempty"`
}

type AnalyzeQualityRequest struct {
	Text     string  `json:"text"`
	Goal     *string `json:"goal"`
	Target   *int    `json:"target"`
	Duration *int    `json:"duration"`
	Unit     *string `json:"unit"`
	Evidence *string `json:"evidence"`
}

type QualityAnalysisResponse struct {
	Specificity         int                    `json:"specificity"`
	Measurability       int                    `json:"measurability"`
	Realism             int                    `json:"realism"`
	Evidence            int                    `json:"evidence"`
	Overall             int                    `json:"overall"`
	Issues              []string               `json:"issues"`
	SuggestedCommitment StructuredGoalResponse `json:"suggested_commitment"`
}

type SuggestCharitiesRequest struct {
	Goal         string `json:"goal" binding:"required"`
	Category     string `json:"category"`
	EvidenceType string `json:"evidence_type"`
}

type CharitySuggestionItem struct {
	CharityID string          `json:"charity_id"`
	Charity    *models.Charity `json:"charity,omitempty"`
	Rationale  string          `json:"rationale"`
}

type SuggestCharitiesResponse struct {
	Suggestions []CharitySuggestionItem `json:"suggestions"`
}

type AnalyzeGoalCombinedRequest struct {
	Text string `json:"text" binding:"required"`
}

type AnalyzeGoalCombinedResponse struct {
	Structured StructuredGoalResponse   `json:"structured"`
	Quality    QualityAnalysisResponse  `json:"quality"`
	Charities  []CharitySuggestionItem `json:"charities"`
}

func (h *AIHandler) StructureGoal(c *gin.Context) {
	var req StructureGoalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "text field is required",
		})
		return
	}

	systemPrompt := `You are the Goal Structurer AI for PledgePay, an escrow platform where users stake money on verifiable commitments.
Turn the user's natural language goal into a structured schema with measurable parameters.
Output JSON matching this exact schema:
{
  "goal": "string (concise title summarizing the milestone)",
  "target": integer (numerical target, default to 5 for DSA, 5 for commits),
  "duration": integer (duration in days: minimum 1 day. If minutes or hours, set duration to 1),
  "unit": "string ('commits' or 'pull_requests' for code, 'problems' for DSA)",
  "evidence": "string ('codeforces_submissions' for DSA/problems, 'github_activity' for commits/PRs)",
  "timeframe_text": "string (e.g. '1 minute', '2 minutes', '1 day')",
  "duration_minutes": integer (number of minutes if specified, e.g. 1 or 2)
}`

	userPrompt := fmt.Sprintf("User goal: %s", strings.TrimSpace(req.Text))

	var structured StructuredGoalResponse
	if err := h.groqClient.Complete(c.Request.Context(), systemPrompt, userPrompt, &structured); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ai_service_error",
			"message": "failed to structure goal",
		})
		return
	}

	lowerText := strings.ToLower(req.Text)
	reMin := regexp.MustCompile(`(?i)(?:in\s+)?(?:next\s+)?(\d+)\s*(?:minutes?|mins?|mintest?|mints?|minuts?|m)\b`)
	if m := reMin.FindStringSubmatch(lowerText); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			structured.DurationMinutes = n
			if n == 1 {
				structured.TimeframeText = "1 minute"
			} else {
				structured.TimeframeText = fmt.Sprintf("%d minutes", n)
			}
			structured.Duration = 1
		}
	}

	if structured.Target <= 0 {
		structured.Target = 10
	}
	if structured.Duration <= 0 {
		structured.Duration = 1
	}
	if structured.Unit == "" {
		structured.Unit = "commits"
	}
	if structured.Evidence == "" {
		structured.Evidence = "github_activity"
	}
	if structured.Goal == "" {
		structured.Goal = req.Text
	}

	c.JSON(http.StatusOK, structured)
}

func (h *AIHandler) AnalyzeQuality(c *gin.Context) {
	var req AnalyzeQualityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "invalid request payload",
		})
		return
	}

	rawGoalText := req.Text
	if rawGoalText == "" && req.Goal != nil {
		rawGoalText = *req.Goal
	}
	if rawGoalText == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "goal text is required for quality analysis",
		})
		return
	}

	systemPrompt := `You are the Commitment Quality Analyzer AI for PledgePay.
Evaluate the developer's commitment for specificity, measurability, realism, and automated verifiable evidence quality.
Score each dimension from 0 to 100.

CRITICAL REALISM & TIMEFRAME RULES:
1. Realism: If the timeframe is impossibly fast (e.g. solving a DSA problem in 1 minute or 5 minutes, shipping a full app in 1 hour), Realism MUST be scored between 10-25%, and Overall MUST be below 50. In issues, explain that authentic problem solving takes 20-45 minutes.
2. Sub-day Minimum: PledgePay automated evidence verifications require a minimum duration of 1 day. If the user specifies minutes or hours, explain this in issues and provide a suggested_commitment with duration of at least 1 day.
3. Excessive Pace: If the pace is impossible (e.g. 50 DSA problems in 1 day), Realism MUST be low (<30%).
4. If the overall score is below 80, provide a list of concrete issues and a realistic suggested_commitment rewrite.

Output JSON matching this exact schema:
{
  "specificity": integer (0-100),
  "measurability": integer (0-100),
  "realism": integer (0-100),
  "evidence": integer (0-100),
  "overall": integer (0-100),
  "issues": ["string array of concrete criticisms, empty if score >= 80"],
  "suggested_commitment": {
    "goal": "string (clear, realistic specific goal)",
    "target": integer,
    "duration": integer,
    "unit": "string",
    "evidence": "string"
  }
}`

	userPrompt := fmt.Sprintf("Analyze this commitment:\nText: %s", rawGoalText)
	if req.Target != nil {
		userPrompt += fmt.Sprintf("\nTarget: %d %s", *req.Target, *req.Unit)
	}
	if req.Duration != nil {
		userPrompt += fmt.Sprintf("\nDuration: %d days", *req.Duration)
	}

	var quality QualityAnalysisResponse
	if err := h.groqClient.Complete(c.Request.Context(), systemPrompt, userPrompt, &quality); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ai_service_error",
			"message": "failed to analyze commitment quality",
		})
		return
	}

	if quality.Overall == 0 {
		quality.Overall = (quality.Specificity + quality.Measurability + quality.Realism + quality.Evidence) / 4
	}
	if quality.Issues == nil {
		quality.Issues = make([]string, 0)
	}
	if quality.SuggestedCommitment.Target <= 0 {
		quality.SuggestedCommitment.Target = 10
	}
	if quality.SuggestedCommitment.Duration <= 0 {
		quality.SuggestedCommitment.Duration = 7
	}
	if quality.SuggestedCommitment.Unit == "" {
		quality.SuggestedCommitment.Unit = "commits"
	}
	if quality.SuggestedCommitment.Evidence == "" {
		quality.SuggestedCommitment.Evidence = "github_activity"
	}

	c.JSON(http.StatusOK, quality)
}

func (h *AIHandler) SuggestCharities(c *gin.Context) {
	var req SuggestCharitiesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "goal is required",
		})
		return
	}

	activeCharities, err := h.charityRepo.ListActive(c.Request.Context())
	if err != nil || len(activeCharities) == 0 {
		c.JSON(http.StatusOK, SuggestCharitiesResponse{Suggestions: []CharitySuggestionItem{}})
		return
	}

	charityMap := make(map[string]models.Charity)
	type CharityInfo struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Category    string `json:"category"`
		Description string `json:"description"`
	}

	charitiesPayload := make([]CharityInfo, 0, len(activeCharities))
	for _, ch := range activeCharities {
		charityMap[ch.ID] = ch
		charitiesPayload = append(charitiesPayload, CharityInfo{
			ID:          ch.ID,
			Name:        ch.Name,
			Category:    ch.Category,
			Description: ch.Description,
		})
	}

	charityJson, _ := json.Marshal(charitiesPayload)

	systemPrompt := `You are the Charity Matcher AI for PledgePay.
Given a developer's goal and a list of active verified charity partners, recommend 2 to 3 most relevant charities to donate the pledge to if the commitment fails.
IMPORTANT: You MUST ONLY select charity_id values from the provided charities list. Never invent or hallucinate a charity ID.
Output JSON matching this exact schema:
{
  "suggestions": [
    {
      "charity_id": "string (must be an exact ID from the provided charities list)",
      "rationale": "string (1-2 sentence compelling rationale explaining why this charity fits the goal)"
    }
  ]
}`

	userPrompt := fmt.Sprintf("Developer Goal: %s\nCategory: %s\nAvailable Charities:\n%s", req.Goal, req.Category, string(charityJson))

	var rawSuggestions struct {
		Suggestions []struct {
			CharityID string `json:"charity_id"`
			Rationale string `json:"rationale"`
		} `json:"suggestions"`
	}

	_ = h.groqClient.Complete(c.Request.Context(), systemPrompt, userPrompt, &rawSuggestions)

	validatedSuggestions := make([]CharitySuggestionItem, 0)
	seen := make(map[string]bool)

	for _, sug := range rawSuggestions.Suggestions {
		if ch, exists := charityMap[sug.CharityID]; exists && !seen[sug.CharityID] {
			seen[sug.CharityID] = true
			chCopy := ch
			validatedSuggestions = append(validatedSuggestions, CharitySuggestionItem{
				CharityID: sug.CharityID,
				Charity:   &chCopy,
				Rationale: sug.Rationale,
			})
		}
	}

	if len(validatedSuggestions) == 0 {
		for i, ch := range activeCharities {
			if i >= 3 {
				break
			}
			chCopy := ch
			validatedSuggestions = append(validatedSuggestions, CharitySuggestionItem{
				CharityID: ch.ID,
				Charity:   &chCopy,
				Rationale: fmt.Sprintf("High-impact verified nonprofit championing %s initiatives.", ch.Category),
			})
		}
	}

	c.JSON(http.StatusOK, SuggestCharitiesResponse{Suggestions: validatedSuggestions})
}

func (h *AIHandler) AnalyzeCombined(c *gin.Context) {
	var req AnalyzeGoalCombinedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "validation_failed",
			"message": "text field is required",
		})
		return
	}

	ctx := c.Request.Context()
	g, gCtx := errgroup.WithContext(ctx)

	var structured StructuredGoalResponse
	var quality QualityAnalysisResponse
	var charities SuggestCharitiesResponse

	g.Go(func() error {
		systemPrompt := `You are the Goal Structurer AI for PledgePay.
Turn the user's natural language goal into a structured schema with measurable parameters.
Output JSON:
{
  "goal": "string (concise title summarizing the milestone)",
  "target": integer,
  "duration": integer,
  "unit": "string",
  "evidence": "string",
  "timeframe_text": "string",
  "duration_minutes": integer
}
RULES: 
- unit MUST be 'problems' for DSA, 'commits' or 'pull_requests' for code/development.
- evidence MUST be 'codeforces_submissions' for DSA/competitive programming, 'github_activity' for commits/PRs.
- if user specifies minutes like '1 minute', '2 minutes', set timeframe_text to e.g. '1 minute', duration_minutes to the number, and duration to 1.
- target should default to 5 for problems/commits.`
		userPrompt := fmt.Sprintf("Goal: %s", req.Text)
		return h.groqClient.Complete(gCtx, systemPrompt, userPrompt, &structured)
	})

	g.Go(func() error {
		systemPrompt := `You are the Commitment Quality Analyzer AI for PledgePay.
Evaluate the commitment for specificity, measurability, realism, and verifiable evidence.
CRITICAL RULES:
1. Automated Evidence: Commitments are verified via automated integrations: GitHub activity (commits, PRs) or Codeforces submissions (problems).
2. Short Demo/Sprint Timeframes: If the user specifies short timeframes like 1 minute, 2 minutes, or 5 minutes for rapid live demo/testing, treat it as a valid rapid sprint commitment. Realism should be 90-95%, Overall 90-95%, and DO NOT complain about the timeframe!
3. When goal has a clear target and evidence source, give high ratings: Specificity 90-95%, Measurability 90-95%, Realism 90-95%, Evidence 90-95%, Overall 90-95%. Issues must be an empty list [].
Output JSON:
{
  "specificity": integer (0-100), "measurability": integer (0-100), "realism": integer (0-100), "evidence": integer (0-100), "overall": integer (0-100),
  "issues": ["string array"],
  "suggested_commitment": {"goal": "string", "target": integer, "duration": integer, "unit": "string", "evidence": "string", "timeframe_text": "string", "duration_minutes": integer}
}`
		userPrompt := fmt.Sprintf("Text: %s", req.Text)
		return h.groqClient.Complete(gCtx, systemPrompt, userPrompt, &quality)
	})

	g.Go(func() error {
		activeCharities, err := h.charityRepo.ListActive(gCtx)
		if err != nil || len(activeCharities) == 0 {
			return nil
		}
		charityMap := make(map[string]models.Charity)
		for _, ch := range activeCharities {
			charityMap[ch.ID] = ch
		}

		rawJSON, _ := json.Marshal(activeCharities)
		systemPrompt := `You are the Charity Matcher AI for PledgePay. Recommend 2 to 3 relevant charities from the list.
Output JSON: {"suggestions": [{"charity_id": "string", "rationale": "string"}]}`
		userPrompt := fmt.Sprintf("Goal: %s\nCharities: %s", req.Text, string(rawJSON))

		var rawSug struct {
			Suggestions []struct {
				CharityID string `json:"charity_id"`
				Rationale string `json:"rationale"`
			} `json:"suggestions"`
		}
		_ = h.groqClient.Complete(gCtx, systemPrompt, userPrompt, &rawSug)

		list := make([]CharitySuggestionItem, 0)
		for _, s := range rawSug.Suggestions {
			if ch, ok := charityMap[s.CharityID]; ok {
				chCopy := ch
				list = append(list, CharitySuggestionItem{
					CharityID: s.CharityID,
					Charity:   &chCopy,
					Rationale: s.Rationale,
				})
			}
		}
		if len(list) == 0 {
			for i, ch := range activeCharities {
				if i >= 3 {
					break
				}
				chCopy := ch
				list = append(list, CharitySuggestionItem{
					CharityID: ch.ID,
					Charity:   &chCopy,
					Rationale: fmt.Sprintf("Verified partner supporting %s causes.", ch.Category),
				})
			}
		}
		charities.Suggestions = list
		return nil
	})

	if err := g.Wait(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "ai_pipeline_error",
			"message": err.Error(),
		})
		return
	}

	lowerText := strings.ToLower(req.Text)
	reMin := regexp.MustCompile(`(?i)(?:in\s+)?(?:next\s+)?(\d+)\s*(?:minutes?|mins?|mintest?|mints?|minuts?|m)\b`)
	if m := reMin.FindStringSubmatch(lowerText); len(m) > 1 {
		if n, err := strconv.Atoi(m[1]); err == nil && n > 0 {
			structured.DurationMinutes = n
			if n == 1 {
				structured.TimeframeText = "1 minute"
			} else {
				structured.TimeframeText = fmt.Sprintf("%d minutes", n)
			}
			structured.Duration = 1
			quality.SuggestedCommitment.DurationMinutes = n
			quality.SuggestedCommitment.TimeframeText = structured.TimeframeText
		}
	}
	if structured.Target <= 0 {
		structured.Target = 5
	}
	if structured.Duration <= 0 {
		structured.Duration = 1
	}
	if structured.Unit == "" {
		if structured.Evidence == "codeforces_submissions" {
			structured.Unit = "problems"
		} else {
			structured.Unit = "commits"
		}
	}
	if structured.Evidence == "" {
		if structured.Unit == "problems" {
			structured.Evidence = "codeforces_submissions"
		} else {
			structured.Evidence = "github_activity"
		}
	}
	if structured.Goal == "" {
		structured.Goal = req.Text
	}
	if structured.TimeframeText == "" && quality.SuggestedCommitment.TimeframeText != "" {
		structured.TimeframeText = quality.SuggestedCommitment.TimeframeText
		structured.DurationMinutes = quality.SuggestedCommitment.DurationMinutes
	}

	c.JSON(http.StatusOK, AnalyzeGoalCombinedResponse{
		Structured: structured,
		Quality:    quality,
		Charities:  charities.Suggestions,
	})
}
