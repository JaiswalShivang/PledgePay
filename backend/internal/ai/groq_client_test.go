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

func TestDocumentTopicMismatch(t *testing.T) {
	cssGoal := "complete today css notes"

	// 1. Off-topic test: Git notes uploaded for CSS goal
	gitNotesText := `
	Git Version Control Notes
	Today I learned how to use Git for version control.
	1. git init to initialize a new repository.
	2. git status to check modified files.
	3. git add . to stage changes in the staging index.
	4. git commit -m "feat: initial commit" to record snapshots.
	5. git branch feature/login to create a new branch.
	6. git checkout feature/login to switch branches.
	7. git merge to merge changes into main.
	8. git push origin main to upload commits to GitHub.
	`

	resMismatch := AuditDocumentContentFallback(cssGoal, "", 1, gitNotesText)
	if resMismatch.IsRelevant {
		t.Errorf("Expected IsRelevant to be false for Git notes on CSS goal, got true")
	}
	if resMismatch.SatisfiesGoal {
		t.Errorf("Expected SatisfiesGoal to be false for Git notes on CSS goal, got true")
	}
	if resMismatch.DetectedTopic != "Git & Version Control" {
		t.Errorf("Expected DetectedTopic 'Git & Version Control', got '%s'", resMismatch.DetectedTopic)
	}
	t.Logf("Mismatch correctly identified: %s (Reasoning: %s)", resMismatch.DetectedTopic, resMismatch.Reasoning)

	// 2. On-topic test: CSS notes uploaded for CSS goal
	cssNotesText := `
	CSS Web Styling Notes
	1. CSS Box Model: content, padding, border, and margin.
	2. Box-sizing: border-box includes padding and border in the element's total width.
	3. Flexbox layout: display: flex, flex-direction: column, justify-content: center, align-items: center.
	4. CSS Grid: display: grid, grid-template-columns: repeat(3, 1fr).
	5. CSS Selectors: class selector .btn, id selector #header, pseudo-class :hover, :focus.
	6. Responsive styles: @media (min-width: 768px) for tablet and desktop viewports.
	`

	resMatch := AuditDocumentContentFallback(cssGoal, "", 1, cssNotesText)
	if !resMatch.IsRelevant {
		t.Errorf("Expected IsRelevant to be true for CSS notes on CSS goal, got false")
	}
	if !resMatch.SatisfiesGoal {
		t.Errorf("Expected SatisfiesGoal to be true for CSS notes on CSS goal, got false")
	}
	if resMatch.DetectedTopic != "CSS & Web Styling" {
		t.Errorf("Expected DetectedTopic 'CSS & Web Styling', got '%s'", resMatch.DetectedTopic)
	}
	t.Logf("Match correctly verified: %s (Reasoning: %s)", resMatch.DetectedTopic, resMatch.Reasoning)
}
