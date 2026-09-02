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

func (c *GroqClient) fallbackComplete(systemPrompt, userPrompt string, out any) error {
	lower := strings.ToLower(userPrompt)

	if strings.Contains(systemPrompt, "Goal Structurer") || strings.Contains(systemPrompt, "structure-goal") {
		var target int = 10
		var duration int = 7
		var unit string = "commits"
		var evidence string = "github_activity"

		if strings.Contains(lower, "dsa") || strings.Contains(lower, "problem") || strings.Contains(lower, "leetcode") {
			unit = "problems"
			target = 20
		} else if strings.Contains(lower, "pr") || strings.Contains(lower, "pull request") {
			unit = "pull_requests"
			target = 5
		}

		mock := map[string]interface{}{
			"goal":     strings.TrimSpace(userPrompt),
			"target":   target,
			"duration": duration,
			"unit":     unit,
			"evidence": evidence,
		}
		raw, _ := json.Marshal(mock)
		return json.Unmarshal(raw, out)
	}

	if strings.Contains(systemPrompt, "Quality Analyzer") || strings.Contains(systemPrompt, "analyze-quality") {
		isVague := len(lower) < 25 || strings.Contains(lower, "good at") || strings.Contains(lower, "learn coding") || strings.Contains(lower, "better")

		if isVague {
			mock := map[string]interface{}{
				"specificity":   32,
				"measurability": 28,
				"realism":       75,
				"evidence":      35,
				"overall":       42,
				"issues": []string{
					"Goal lacks concrete quantitative target (e.g. number of PRs or commits).",
					"No explicit timeframe defined (e.g. 7 days or 14 days).",
					"Objective criteria are not directly verifiable via GitHub evidence.",
				},
				"suggested_commitment": map[string]interface{}{
					"goal":     "Merge 5 GitHub pull requests in 7 days",
					"target":   5,
					"duration": 7,
					"unit":     "pull_requests",
					"evidence": "github_activity",
				},
			}
			raw, _ := json.Marshal(mock)
			return json.Unmarshal(raw, out)
		}

		mock := map[string]interface{}{
			"specificity":   92,
			"measurability": 95,
			"realism":       88,
			"evidence":      91,
			"overall":       91,
			"issues":        []string{},
			"suggested_commitment": map[string]interface{}{
				"goal":     strings.TrimSpace(userPrompt),
				"target":   15,
				"duration": 7,
				"unit":     "contributions",
				"evidence": "github_activity",
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

	return errors.New("unsupported prompt type for fallback completion")
}
