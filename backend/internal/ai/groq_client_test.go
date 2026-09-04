package ai

import (
	"context"
	"testing"
)

func TestExtractGoalParametersAndQuality(t *testing.T) {
	prompt := "i will solve 1 problem of dsa in 1 next 1 minute"
	p := extractGoalParameters(prompt)

	if p.Target != 1 {
		t.Errorf("expected target 1, got %d", p.Target)
	}
	if p.Unit != "problems" {
		t.Errorf("expected unit 'problems', got '%s'", p.Unit)
	}
	if p.TimeframeText != "1 minute" {
		t.Errorf("expected TimeframeText '1 minute', got '%s'", p.TimeframeText)
	}

	client := NewGroqClient("", "")

	var structured struct {
		Goal          string `json:"goal"`
		Target        int    `json:"target"`
		Duration      int    `json:"duration"`
		Unit          string `json:"unit"`
		Evidence      string `json:"evidence"`
		TimeframeText string `json:"timeframe_text"`
	}

	err := client.Complete(context.Background(), "Goal Structurer", prompt, &structured)
	if err != nil {
		t.Fatalf("Goal Structurer failed: %v", err)
	}

	t.Logf("Structured: %+v", structured)
	if structured.TimeframeText != "1 minute" {
		t.Errorf("expected structured.TimeframeText '1 minute', got '%s'", structured.TimeframeText)
	}

	var quality struct {
		Specificity         int      `json:"specificity"`
		Measurability       int      `json:"measurability"`
		Realism             int      `json:"realism"`
		Evidence            int      `json:"evidence"`
		Overall             int      `json:"overall"`
		Issues              []string `json:"issues"`
		SuggestedCommitment struct {
			Goal          string `json:"goal"`
			Target        int    `json:"target"`
			Duration      int    `json:"duration"`
			Unit          string `json:"unit"`
			TimeframeText string `json:"timeframe_text"`
		} `json:"suggested_commitment"`
	}

	err = client.Complete(context.Background(), "Quality Analyzer", prompt, &quality)
	if err != nil {
		t.Fatalf("Complete failed: %v", err)
	}

	t.Logf("Specificity: %d, Measurability: %d, Realism: %d, Overall: %d", quality.Specificity, quality.Measurability, quality.Realism, quality.Overall)
	t.Logf("Issues: %v", quality.Issues)
	t.Logf("Suggested: %+v", quality.SuggestedCommitment)

	if quality.Realism < 85 {
		t.Errorf("expected high realism >= 85 for 1 DSA problem, got %d", quality.Realism)
	}
	if quality.Overall < 90 {
		t.Errorf("expected high overall score >= 90 for 1 DSA problem, got %d", quality.Overall)
	}
	if len(quality.Issues) > 0 {
		t.Errorf("expected 0 issues for a clear goal, got %d: %v", len(quality.Issues), quality.Issues)
	}
}
