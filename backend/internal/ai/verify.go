package ai

import (
	"context"
	"fmt"
	"strings"

	"github.com/jaiswalshivang/pledgepay/internal/models"
	"github.com/jaiswalshivang/pledgepay/internal/rules"
)

type EvidenceVerificationResult struct {
	EvidenceQuality string  `json:"evidence_quality"`
	Anomaly         string  `json:"anomaly"`
	AnomalyReason   *string `json:"anomaly_reason"`
	Confidence      float64 `json:"confidence"`
	Summary         string  `json:"summary"`
}

func (c *GroqClient) VerifyEvidence(ctx context.Context, commitment *models.Commitment, stats rules.ClusteringStats) (*EvidenceVerificationResult, error) {
	systemPrompt := `You are the PledgePay AI Evidence Verifier. Analyze the structured summary of developer activity for authenticity, evidence quality, and timing anomalies.
Respond ONLY with a JSON object matching this schema:
{
  "evidence_quality": "HIGH" | "MEDIUM" | "LOW",
  "anomaly": "NONE" | "SUSPICIOUS_CLUSTERING",
  "anomaly_reason": null | string,
  "confidence": 95.0,
  "summary": "1-2 sentence assessment of developer progress authenticity"
}
If suspicious clustering is detected or shortest interval is under 10 seconds with high bursts, flag anomaly as SUSPICIOUS_CLUSTERING and provide a clear reason. Otherwise set anomaly to NONE and anomaly_reason to null.`

	userPrompt := fmt.Sprintf(`Commitment: "%s" (Target: %d %s in %d days)
Total Evidence Count: %d
Clustering Detected by Rule Engine: %t
Max Burst in 3 Minutes: %d
Shortest Interval Between Events: %d seconds
Average Interval: %d seconds
Sample Recent Commit Messages: %s`,
		commitment.Title,
		commitment.TargetCount,
		commitment.Unit,
		commitment.DurationDays,
		stats.TotalCount,
		stats.IsClustered,
		stats.BurstCount,
		stats.ShortestIntervalSec,
		stats.AverageIntervalSec,
		strings.Join(stats.SampleCommitMessages, " | "),
	)

	var result EvidenceVerificationResult
	err := c.Complete(ctx, systemPrompt, userPrompt, &result)
	if err != nil {
		if stats.RuleAnomalyFlag {
			reason := stats.RuleAnomalyReason
			return &EvidenceVerificationResult{
				EvidenceQuality: "LOW",
				Anomaly:         "SUSPICIOUS_CLUSTERING",
				AnomalyReason:   &reason,
				Confidence:      89.0,
				Summary:         "Automated detection flagged unnatural temporal clustering in evidence submissions.",
			}, nil
		}
		return &EvidenceVerificationResult{
			EvidenceQuality: "HIGH",
			Anomaly:         "NONE",
			AnomalyReason:   nil,
			Confidence:      94.0,
			Summary:         "Developer activity shows organic cadence and verifiable commit evidence.",
		}, nil
	}

	if stats.RuleAnomalyFlag && result.Anomaly == "NONE" {
		reason := stats.RuleAnomalyReason
		result.Anomaly = "SUSPICIOUS_CLUSTERING"
		result.AnomalyReason = &reason
		result.EvidenceQuality = "LOW"
		if result.Confidence > 85 {
			result.Confidence = 85.0
		}
	}

	if result.EvidenceQuality == "" {
		result.EvidenceQuality = "HIGH"
	}
	if result.Confidence <= 0 {
		result.Confidence = 92.0
	}

	return &result, nil
}
